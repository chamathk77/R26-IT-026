process.env.JWT_SECRET = 'retention-test-secret';

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const mongoose = require('mongoose');

const mockUsers = new Map();
const mockActionsStore = [];

jest.mock('../src/models/user', () => ({
  findById: jest.fn((id) => ({
    select: () => ({
      lean: async () => mockUsers.get(String(id)) ?? null,
    }),
  })),
  findByIdAndUpdate: jest.fn(async () => null),
}));

// Mock CustomerBehaviorAction using mockActionsStore
jest.mock('../src/models/customerBehaviorAction', () => {
  const mongooseInside = require('mongoose');

  function MockCustomerBehaviorAction(data) {
    this._id = new mongooseInside.Types.ObjectId().toString();
    this.shopId = String(data.shopId || '').toUpperCase();
    this.branchId = String(data.branchId || '').toUpperCase();
    this.title = data.title;
    this.description = data.description || '';
    this.targetSegment = data.targetSegment;
    this.priority = data.priority || 'Medium';
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || data.dueDate || null;
    this.dueDate = data.dueDate || data.endDate || null;
    this.status = data.status || 'Planned';
    this.createdBy = data.createdBy || null;
    this.createdByName = data.createdByName || '';
    this.updatedBy = data.updatedBy || null;
    this.createdAt = new Date();
    const now = new Date();
    const effectiveEnd = this.endDate || this.dueDate;
    if (effectiveEnd && new Date(effectiveEnd) <= now) {
      this.status = 'Completed';
    } else if (this.startDate && new Date(this.startDate) <= now) {
      if (this.status === 'Planned') {
        this.status = 'In Progress';
      }
    }

    this.save = jest.fn(async () => {
      const nowSave = new Date();
      const saveEnd = this.endDate || this.dueDate;
      if (saveEnd && new Date(saveEnd) <= nowSave) {
        this.status = 'Completed';
      } else if (this.startDate && new Date(this.startDate) <= nowSave) {
        if (this.status === 'Planned') {
          this.status = 'In Progress';
        }
      }

      const idx = mockActionsStore.findIndex((a) => a._id.toString() === this._id.toString());
      if (idx >= 0) {
        this.updatedAt = new Date();
        mockActionsStore[idx] = this;
      } else {
        mockActionsStore.push(this);
      }
      return this;
    });
  }

  MockCustomerBehaviorAction.find = jest.fn((filter) => {
    return {
      sort: jest.fn(() => ({
        lean: jest.fn(async () => {
          return mockActionsStore.filter((a) => {
            if (filter.shopId && a.shopId !== filter.shopId) return false;
            if (filter.branchId && a.branchId !== filter.branchId) return false;
            if (filter.status && a.status !== filter.status) return false;
            if (filter.targetSegment && a.targetSegment !== filter.targetSegment) return false;
            if (filter.priority && a.priority !== filter.priority) return false;
            if (filter.$or) {
              const term = filter.$or[0]?.title?.$regex;
              if (term) {
                const re = new RegExp(term, 'i');
                return re.test(a.title) || re.test(a.description);
              }
            }
            return true;
          });
        }),
      })),
    };
  });

  MockCustomerBehaviorAction.findOne = jest.fn((filter) => {
    const found = mockActionsStore.find((a) => {
      if (filter._id && a._id.toString() !== filter._id.toString()) return false;
      if (filter.shopId && a.shopId !== filter.shopId) return false;
      return true;
    });

    if (!found) {
      return Object.assign(Promise.resolve(null), {
        lean: async () => null,
      });
    }

    const item = { ...found };
    item.save = jest.fn(async function () {
      item.updatedAt = new Date();
      const idx = mockActionsStore.findIndex((x) => x._id.toString() === item._id.toString());
      if (idx >= 0) {
        mockActionsStore[idx] = item;
      }
      return item;
    });

    return Object.assign(Promise.resolve(item), {
      lean: async () => item,
    });
  });

  MockCustomerBehaviorAction.findByIdAndDelete = jest.fn(async (id) => {
    const idx = mockActionsStore.findIndex((a) => a._id.toString() === id.toString());
    if (idx >= 0) {
      return mockActionsStore.splice(idx, 1)[0];
    }
    return null;
  });

  MockCustomerBehaviorAction.updateMany = jest.fn(async (filter, update) => {
    let modifiedCount = 0;
    mockActionsStore.forEach((a) => {
      if (filter.shopId && a.shopId !== filter.shopId) return;
      if (filter.branchId && a.branchId !== filter.branchId) return;
      if (filter.status) {
        if (typeof filter.status === 'string' && a.status !== filter.status) return;
        if (filter.status.$in && !filter.status.$in.includes(a.status)) return;
      }
      if (filter.startDate) {
        if (filter.startDate.$lte) {
          if (!a.startDate || new Date(a.startDate) > filter.startDate.$lte) return;
        }
      }
      if (filter.$or) {
        const matchesOr = filter.$or.some((cond) => {
          if (cond.endDate && cond.endDate.$lte) {
            return a.endDate && new Date(a.endDate) <= cond.endDate.$lte;
          }
          if (cond.dueDate && cond.dueDate.$lte) {
            return a.dueDate && new Date(a.dueDate) <= cond.dueDate.$lte;
          }
          return false;
        });
        if (!matchesOr) return;
      }

      if (update.$set) {
        Object.assign(a, update.$set);
        a.updatedAt = new Date();
        modifiedCount++;
      }
    });
    return { acknowledged: true, modifiedCount };
  });

  return MockCustomerBehaviorAction;
});

const behaviorRoutes = require('../src/novelty/novelty02CustomerBehavior/behaviorRoutes');

const app = express();
app.use(express.json());
app.use('/api/customer-behavior', behaviorRoutes);

function tokenFor(id, claims) {
  const token = jwt.sign({ id, ...claims }, process.env.JWT_SECRET);
  mockUsers.set(id, { token, shopId: claims.shopId, name: claims.name || 'Test User' });
  return token;
}

const shopAUserToken = tokenFor('user-shop-a', { shopId: 'SI000001', branchId: 'B00001', name: 'Manager A' });
const shopBUserToken = tokenFor('user-shop-b', { shopId: 'SI000002', branchId: 'B00001', name: 'Manager B' });
const noBranchToken = tokenFor('user-no-branch', { shopId: 'SI000001' });

describe('Customer Retention Action Management API', () => {
  beforeEach(() => {
    mockActionsStore.length = 0;
  });

  describe('Authentication and Branch Guard', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/customer-behavior/actions');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects requests without branchId with 400', async () => {
      const res = await request(app)
        .get('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${noBranchToken}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BRANCH_REQUIRED');
    });
  });

  describe('POST /api/customer-behavior/actions (Create)', () => {
    it('creates a retention action with valid data', async () => {
      const payload = {
        title: 'VIP Loyalty Discount Campaign',
        description: 'Provide 10% discount coupon to high spending VIP customers',
        targetSegment: 'VIP / Loyal',
        priority: 'High',
        dueDate: '2026-11-30T00:00:00.000Z',
        status: 'Planned',
      };

      const res = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.targetSegment).toBe('VIP / Loyal');
      expect(res.body.data.priority).toBe('High');
      expect(res.body.data.status).toBe('Planned');
      expect(res.body.data.shopId).toBe('SI000001');
      expect(res.body.data.branchId).toBe('B00001');
      expect(res.body.data.createdByName).toBe('Manager A');
    });

    it('rejects action creation without title', async () => {
      const res = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          targetSegment: 'Regular',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/title is required/i);
    });

    it('rejects action creation with invalid target segment', async () => {
      const res = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Special promotion',
          targetSegment: 'NonExistentSegment',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/target segment is required/i);
    });

    it('rejects action creation with invalid priority or status', async () => {
      const res = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Special promotion',
          targetSegment: 'Regular',
          priority: 'Urgent',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/priority must be one of/i);
    });

    it('rejects action creation with invalid due date', async () => {
      const res = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Special promotion',
          targetSegment: 'Regular',
          dueDate: 'invalid-date-string',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/end date must be a valid date|due date must be a valid date/i);
    });

    it('rejects action creation when endDate is earlier than startDate', async () => {
      const res = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Timeline inverted',
          targetSegment: 'Regular',
          startDate: '2026-11-20T00:00:00.000Z',
          endDate: '2026-11-10T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/end date cannot be earlier than start date/i);
    });

    it('creates action with startDate and endDate', async () => {
      const res = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Two week retention rush',
          targetSegment: 'Occasional',
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-15T00:00:00.000Z',
          status: 'Planned',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.startDate).toBeTruthy();
      expect(res.body.data.endDate).toBeTruthy();
    });
  });

  describe('GET /api/customer-behavior/actions (Read List)', () => {
    it('returns empty array when no actions exist', async () => {
      const res = await request(app)
        .get('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('returns actions isolated to the authenticated shop and branch', async () => {
      await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Shop A Action',
          targetSegment: 'Occasional',
        });

      await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopBUserToken}`)
        .send({
          title: 'Shop B Action',
          targetSegment: 'At Risk / Lapsed',
        });

      const resA = await request(app)
        .get('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(resA.status).toBe(200);
      expect(resA.body.count).toBe(1);
      expect(resA.body.data[0].title).toBe('Shop A Action');

      const resB = await request(app)
        .get('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopBUserToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.count).toBe(1);
      expect(resB.body.data[0].title).toBe('Shop B Action');
    });

    it('filters actions by status', async () => {
      await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'Action 1', targetSegment: 'Regular', status: 'Planned' });

      await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'Action 2', targetSegment: 'Regular', status: 'In Progress' });

      const res = await request(app)
        .get('/api/customer-behavior/actions?status=In Progress')
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Action 2');
    });
  });

  describe('GET /api/customer-behavior/actions/:id (Read Single)', () => {
    it('returns 400 for invalid mongo ObjectId', async () => {
      const res = await request(app)
        .get('/api/customer-behavior/actions/not-an-id')
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid action id/i);
    });

    it('returns 404 for nonexistent action', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/customer-behavior/actions/${fakeId}`)
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns single action if owned by shop', async () => {
      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'Targeted Offer', targetSegment: 'VIP / Loyal' });

      const actionId = createRes.body.data._id;

      const getRes = await request(app)
        .get(`/api/customer-behavior/actions/${actionId}`)
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.title).toBe('Targeted Offer');
    });

    it('prevents Shop B from reading Shop A action (isolation)', async () => {
      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'Confidential Strategy', targetSegment: 'VIP / Loyal' });

      const actionId = createRes.body.data._id;

      const getRes = await request(app)
        .get(`/api/customer-behavior/actions/${actionId}`)
        .set('Authorization', `Bearer ${shopBUserToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('PATCH /api/customer-behavior/actions/:id (Update)', () => {
    it('updates action fields correctly', async () => {
      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'Initial Title', targetSegment: 'Occasional', status: 'Planned' });

      const actionId = createRes.body.data._id;

      const patchRes = await request(app)
        .patch(`/api/customer-behavior/actions/${actionId}`)
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Updated Title',
          status: 'Completed',
          priority: 'High',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.title).toBe('Updated Title');
      expect(patchRes.body.data.status).toBe('Completed');
      expect(patchRes.body.data.priority).toBe('High');
    });

    it('prevents Shop B from updating Shop A action', async () => {
      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'Shop A Only', targetSegment: 'Regular' });

      const actionId = createRes.body.data._id;

      const patchRes = await request(app)
        .patch(`/api/customer-behavior/actions/${actionId}`)
        .set('Authorization', `Bearer ${shopBUserToken}`)
        .send({ title: 'Hacked Title' });

      expect(patchRes.status).toBe(404);
    });
  });

  describe('DELETE /api/customer-behavior/actions/:id (Delete)', () => {
    it('deletes the selected action', async () => {
      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'To Be Deleted', targetSegment: 'Regular' });

      const actionId = createRes.body.data._id;

      const deleteRes = await request(app)
        .delete(`/api/customer-behavior/actions/${actionId}`)
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/customer-behavior/actions/${actionId}`)
        .set('Authorization', `Bearer ${shopAUserToken}`);
      expect(getRes.status).toBe(404);
    });

    it('prevents Shop B from deleting Shop A action', async () => {
      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({ title: 'Protected Action', targetSegment: 'Regular' });

      const actionId = createRes.body.data._id;

      const deleteRes = await request(app)
        .delete(`/api/customer-behavior/actions/${actionId}`)
        .set('Authorization', `Bearer ${shopBUserToken}`);

      expect(deleteRes.status).toBe(404);
    });
  });

  describe('Automatic Status Transitions (Lifecycle Progression)', () => {
    it('automatically transitions Planned action to In Progress when startDate arrives', async () => {
      // Create a planned action with startDate in the past (already arrived) and endDate in the future
      const pastStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const futureEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Auto-advance to In Progress',
          targetSegment: 'VIP / Loyal',
          startDate: pastStart,
          endDate: futureEnd,
          status: 'Planned',
        });

      expect(createRes.status).toBe(201);
      // Because startDate is in the past, it automatically created or transitioned to In Progress
      expect(createRes.body.data.status).toBe('In Progress');
    });

    it('automatically transitions action to Completed when endDate arrives/passes', async () => {
      // Create an action with both startDate and endDate in the past
      const pastStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const pastEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

      const createRes = await request(app)
        .post('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`)
        .send({
          title: 'Auto-advance to Completed',
          targetSegment: 'At Risk / Lapsed',
          startDate: pastStart,
          endDate: pastEnd,
          status: 'Planned',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.status).toBe('Completed');
    });

    it('automatically updates database records on GET /api/customer-behavior/actions when dates arrive', async () => {
      // Manually push a planned action whose start date arrived into the mock store
      const actionDoc = {
        _id: 'auto-test-action-1',
        shopId: 'SI000001',
        branchId: 'B00001',
        title: 'Batch Auto Start Campaign',
        targetSegment: 'Regular',
        priority: 'High',
        startDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days ahead
        status: 'Planned',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockActionsStore.push(actionDoc);

      const listRes = await request(app)
        .get('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((a) => a._id === 'auto-test-action-1');
      expect(found).toBeDefined();
      expect(found.status).toBe('In Progress');
    });

    it('automatically completes expired in-progress actions on GET /api/customer-behavior/actions', async () => {
      const expiredDoc = {
        _id: 'auto-test-action-2',
        shopId: 'SI000001',
        branchId: 'B00001',
        title: 'Batch Auto Complete Campaign',
        targetSegment: 'Occasional',
        priority: 'Medium',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        status: 'In Progress',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockActionsStore.push(expiredDoc);

      const listRes = await request(app)
        .get('/api/customer-behavior/actions')
        .set('Authorization', `Bearer ${shopAUserToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((a) => a._id === 'auto-test-action-2');
      expect(found).toBeDefined();
      expect(found.status).toBe('Completed');
    });
  });
});
