const mongoose = require('mongoose');
const SalePerson = require('../models/salePerson');
const User = require('../models/user');
const Branch = require('../models/branch');
const {
  publicImagePath,
  unlinkSalePersonImageIfLocal,
} = require('../middleware/uploadSalePersonImage');

const SALE_PERSON_MANAGER_ROLES = ['admin', 'owner'];

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid sale person id', success: false });
}

function normalizeSalePersonId(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function normalizeBranchId(branchId) {
  return String(branchId ?? '').trim().toUpperCase();
}

function normalizeAllowedBranchIds(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map(normalizeBranchId).filter(Boolean))];
  }

  if (typeof input === 'string') {
    return [...new Set(input.split(',').map(normalizeBranchId).filter(Boolean))];
  }

  return [];
}

async function getActiveBranchesForShop(shopId) {
  return Branch.find({ shopId, isActive: true })
    .select('branchId branchName isMainBranch isActive')
    .sort({ isMainBranch: -1, createdAt: 1 })
    .lean();
}

async function resolveAllowedBranchIds(shopId, requestedAllowedBranchIds, { requireAtLeastOne = false } = {}) {
  const activeBranches = await getActiveBranchesForShop(shopId);
  const activeBranchIds = activeBranches.map((branch) => normalizeBranchId(branch.branchId));

  if (!activeBranchIds.length) {
    return {
      error: {
        status: 400,
        message: 'No active branch found for this shop.',
        code: 'SHOP_BRANCH_REQUIRED',
      },
    };
  }

  const normalizedRequested = normalizeAllowedBranchIds(requestedAllowedBranchIds);

  if (requireAtLeastOne && !normalizedRequested.length) {
    return {
      error: {
        status: 400,
        message: 'Select at least one branch for this sales person.',
        code: 'ALLOWED_BRANCH_IDS_REQUIRED',
      },
    };
  }

  const invalidBranchIds = normalizedRequested.filter((branchId) => !activeBranchIds.includes(branchId));

  if (invalidBranchIds.length) {
    return {
      error: {
        status: 400,
        message: 'Some selected branches are invalid or inactive for this shop',
        code: 'INVALID_ALLOWED_BRANCH_IDS',
        invalidBranchIds,
      },
    };
  }

  return { allowedBranchIds: normalizedRequested };
}

function mapSalePersonRecord(record) {
  return {
    _id: record._id,
    shopId: record.shopId,
    salePersonId: record.salePersonId,
    firstName: record.firstName,
    lastName: record.lastName,
    position: record.position,
    allowedBranchIds: Array.isArray(record.allowedBranchIds) ? record.allowedBranchIds : [],
    image: record.image ?? '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function rollbackUploadedFile(req) {
  if (req.file) {
    unlinkSalePersonImageIfLocal(publicImagePath(req.file.filename));
  }
}

function resolveSalePersonImageForCreate(req) {
  if (req.file) {
    return publicImagePath(req.file.filename);
  }
  if (req.body?.image != null && String(req.body.image).trim() !== '') {
    return String(req.body.image).trim();
  }
  return '';
}

function applySalePersonImageUpdate(req, existing, updates) {
  if (req.file) {
    if (existing.image) {
      unlinkSalePersonImageIfLocal(existing.image);
    }
    updates.image = publicImagePath(req.file.filename);
    return;
  }

  if (req.body?.image !== undefined) {
    const nextImage = String(req.body.image).trim();
    if (nextImage !== existing.image && existing.image) {
      unlinkSalePersonImageIfLocal(existing.image);
    }
    updates.image = nextImage;
  }
}

function duplicateSalePersonIdMessage() {
  return 'A sales person with this salePersonId already exists for this shop';
}

async function getSalePersonAccessContext(userId) {
  const user = await User.findById(userId).select('role shopId').lean();
  if (!user) {
    return { error: { status: 401, message: 'Not authorized, user not found' } };
  }
  if (!SALE_PERSON_MANAGER_ROLES.includes(user.role)) {
    return { error: { status: 403, message: 'Only admin and owner can manage sales persons' } };
  }
  const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
  if (!shopId) {
    return { error: { status: 400, message: 'Shop id is required' } };
  }
  return { shopId };
}

function sendAccessError(res, error) {
  return res.status(error.status).json({
    message: error.message,
    success: false,
    code: error.code,
    invalidBranchIds: error.invalidBranchIds,
  });
}

function getRequestBranchId(req) {
  return normalizeBranchId(req.user?.branchId);
}

function parseForBranchQuery(value) {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  return ['1', 'true', 'yes'].includes(String(value).trim().toLowerCase());
}

function resolveSalePersonBranchFilter(req) {
  const queryBranchId = normalizeBranchId(req.query?.branchId);
  if (queryBranchId) {
    return queryBranchId;
  }

  if (parseForBranchQuery(req.query?.forBranch)) {
    return getRequestBranchId(req) || null;
  }

  return null;
}

function salePersonHasBranchAccess(record, branchId) {
  if (!branchId) {
    return true;
  }

  const allowedBranchIds = Array.isArray(record?.allowedBranchIds) ? record.allowedBranchIds : [];
  return allowedBranchIds.includes(branchId);
}

const createSalePerson = async (req, res) => {
  try {
    const access = await getSalePersonAccessContext(req.user.id);
    if (access.error) {
      rollbackUploadedFile(req);
      return sendAccessError(res, access.error);
    }

    const { shopId } = access;
    const { salePersonId, firstName, lastName, position, allowedBranchIds: requestedAllowedBranchIds } =
      req.body;
    const normalizedSalePersonId = normalizeSalePersonId(salePersonId);
    const firstNameTrimmed = firstName != null ? String(firstName).trim() : '';
    const lastNameTrimmed = lastName != null ? String(lastName).trim() : '';
    const positionTrimmed = position != null ? String(position).trim() : '';

    if (!normalizedSalePersonId) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'salePersonId is required', success: false });
    }
    if (!firstNameTrimmed) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'firstName is required', success: false });
    }
    if (!lastNameTrimmed) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'lastName is required', success: false });
    }
    if (!positionTrimmed) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'position is required', success: false });
    }

    const allowedBranchesResult = await resolveAllowedBranchIds(shopId, requestedAllowedBranchIds, {
      requireAtLeastOne: true,
    });
    if (allowedBranchesResult.error) {
      rollbackUploadedFile(req);
      return sendAccessError(res, allowedBranchesResult.error);
    }

    const salePerson = await SalePerson.create({
      shopId,
      salePersonId: normalizedSalePersonId,
      firstName: firstNameTrimmed,
      lastName: lastNameTrimmed,
      position: positionTrimmed,
      allowedBranchIds: allowedBranchesResult.allowedBranchIds,
      image: resolveSalePersonImageForCreate(req),
    });

    return res.status(201).json({ success: true, data: mapSalePersonRecord(salePerson) });
  } catch (error) {
    rollbackUploadedFile(req);
    if (error.code === 11000) {
      return res.status(400).json({ message: duplicateSalePersonIdMessage(), success: false });
    }
    return res.status(500).json({ message: error.message, success: false });
  }
};

const getSalePersons = async (req, res) => {
  try {
    const access = await getSalePersonAccessContext(req.user.id);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    const { shopId } = access;
    const branchId = resolveSalePersonBranchFilter(req);
    const filter = { shopId };

    if (branchId) {
      filter.allowedBranchIds = branchId;
    }

    const salePersons = await SalePerson.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: salePersons.length,
      branchId: branchId ?? null,
      data: salePersons.map(mapSalePersonRecord),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const getSalePersonById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const access = await getSalePersonAccessContext(req.user.id);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    const { shopId } = access;
    const branchId = resolveSalePersonBranchFilter(req);

    const salePerson = await SalePerson.findOne({ _id: id, shopId }).lean();
    if (!salePerson) {
      return res.status(404).json({ message: 'Sales person not found', success: false });
    }

    if (!salePersonHasBranchAccess(salePerson, branchId)) {
      return res.status(404).json({
        message: 'Sales person not found for this branch',
        success: false,
        code: 'SALE_PERSON_BRANCH_FORBIDDEN',
      });
    }

    return res.json({
      success: true,
      branchId: branchId ?? null,
      data: mapSalePersonRecord(salePerson),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

const updateSalePerson = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      rollbackUploadedFile(req);
      return invalidIdResponse(res);
    }

    const access = await getSalePersonAccessContext(req.user.id);
    if (access.error) {
      rollbackUploadedFile(req);
      return sendAccessError(res, access.error);
    }

    const { shopId } = access;

    const existing = await SalePerson.findOne({ _id: id, shopId });
    if (!existing) {
      rollbackUploadedFile(req);
      return res.status(404).json({ message: 'Sales person not found', success: false });
    }

    const { salePersonId, firstName, lastName, position, allowedBranchIds: requestedAllowedBranchIds } =
      req.body;
    const updates = {};

    if (salePersonId !== undefined) {
      const normalizedSalePersonId = normalizeSalePersonId(salePersonId);
      if (!normalizedSalePersonId) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: 'salePersonId cannot be empty', success: false });
      }
      updates.salePersonId = normalizedSalePersonId;
    }

    if (firstName !== undefined) {
      const firstNameTrimmed = String(firstName).trim();
      if (!firstNameTrimmed) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: 'firstName cannot be empty', success: false });
      }
      updates.firstName = firstNameTrimmed;
    }

    if (lastName !== undefined) {
      const lastNameTrimmed = String(lastName).trim();
      if (!lastNameTrimmed) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: 'lastName cannot be empty', success: false });
      }
      updates.lastName = lastNameTrimmed;
    }

    if (position !== undefined) {
      const positionTrimmed = String(position).trim();
      if (!positionTrimmed) {
        rollbackUploadedFile(req);
        return res.status(400).json({ message: 'position cannot be empty', success: false });
      }
      updates.position = positionTrimmed;
    }

    if (requestedAllowedBranchIds !== undefined) {
      const allowedBranchesResult = await resolveAllowedBranchIds(
        shopId,
        requestedAllowedBranchIds,
        { requireAtLeastOne: true },
      );
      if (allowedBranchesResult.error) {
        rollbackUploadedFile(req);
        return sendAccessError(res, allowedBranchesResult.error);
      }
      updates.allowedBranchIds = allowedBranchesResult.allowedBranchIds;
    }

    applySalePersonImageUpdate(req, existing, updates);

    if (Object.keys(updates).length === 0) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'No fields to update', success: false });
    }

    const salePerson = await SalePerson.findOneAndUpdate({ _id: id, shopId }, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();

    return res.json({ success: true, data: mapSalePersonRecord(salePerson) });
  } catch (error) {
    rollbackUploadedFile(req);
    if (error.code === 11000) {
      return res.status(400).json({ message: duplicateSalePersonIdMessage(), success: false });
    }
    return res.status(500).json({ message: error.message, success: false });
  }
};

const deleteSalePerson = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return invalidIdResponse(res);
    }

    const access = await getSalePersonAccessContext(req.user.id);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    const { shopId } = access;

    const salePerson = await SalePerson.findOneAndDelete({ _id: id, shopId });
    if (!salePerson) {
      return res.status(404).json({ message: 'Sales person not found', success: false });
    }

    if (salePerson.image) {
      unlinkSalePersonImageIfLocal(salePerson.image);
    }

    return res.json({
      success: true,
      message: 'Sales person removed',
      id: salePerson._id,
      salePersonId: salePerson.salePersonId,
      allowedBranchIds: Array.isArray(salePerson.allowedBranchIds)
        ? salePerson.allowedBranchIds
        : [],
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};



module.exports = {
  createSalePerson,
  getSalePersons,
  getSalePersonById,
  updateSalePerson,
  deleteSalePerson,
};
