const mongoose = require('mongoose');
const CustomerBehaviorAction = require('../../models/customerBehaviorAction');
const User = require('../../models/user');

const VALID_SEGMENTS = ['VIP / Loyal', 'Regular', 'Occasional', 'At Risk / Lapsed'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['Planned', 'In Progress', 'Completed'];

function normalizeId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

function normalizeSegment(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (s.toLowerCase() === 'at risk / lapsed' || s.toLowerCase() === 'at-risk / lapsed') {
    return 'At Risk / Lapsed';
  }
  return s;
}

function resolveShopAndBranch(req, res) {
  const shopId = normalizeId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: 'Shop id is required' });
    return null;
  }

  const branchId =
    normalizeId(req.headers['x-branch-id']) ||
    normalizeId(req.query?.branchId) ||
    normalizeId(req.body?.branchId) ||
    normalizeId(req.user?.branchId);

  if (!branchId) {
    res.status(400).json({
      success: false,
      message: 'Branch id is required. Please select a branch first.',
      code: 'BRANCH_REQUIRED',
    });
    return null;
  }

  return { shopId, branchId };
}

async function autoTransitionActionStatuses(shopId, branchId) {
  try {
    const now = new Date();

    // 1. Transition to Completed: Any Planned or In Progress action whose end date has arrived/passed
    await CustomerBehaviorAction.updateMany(
      {
        shopId,
        ...(branchId ? { branchId } : {}),
        status: { $in: ['Planned', 'In Progress'] },
        $or: [
          { endDate: { $ne: null, $lte: now } },
          { dueDate: { $ne: null, $lte: now } },
        ],
      },
      {
        $set: { status: 'Completed' },
      },
    );

    // 2. Transition to In Progress: Any remaining Planned action whose start date has arrived
    await CustomerBehaviorAction.updateMany(
      {
        shopId,
        ...(branchId ? { branchId } : {}),
        status: 'Planned',
        startDate: { $ne: null, $lte: now },
      },
      {
        $set: { status: 'In Progress' },
      },
    );
  } catch (err) {
    // Graceful fallback
  }
}

/**
 * GET /api/customer-behavior/actions
 * List all retention actions for the authorized shop & branch
 */
const getRetentionActions = async (req, res) => {
  try {
    const context = resolveShopAndBranch(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    await autoTransitionActionStatuses(shopId, branchId);

    const filter = { shopId, branchId };

    if (req.query.status) {
      const status = String(req.query.status).trim();
      if (VALID_STATUSES.includes(status)) {
        filter.status = status;
      }
    }

    if (req.query.targetSegment) {
      const seg = normalizeSegment(req.query.targetSegment);
      if (VALID_SEGMENTS.includes(seg)) {
        filter.targetSegment = seg;
      }
    }

    if (req.query.priority) {
      const priority = String(req.query.priority).trim();
      if (VALID_PRIORITIES.includes(priority)) {
        filter.priority = priority;
      }
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
    }

    const actions = await CustomerBehaviorAction.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      count: actions.length,
      data: actions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/customer-behavior/actions/:id
 * Retrieve a single retention action by ID
 */
const getRetentionActionById = async (req, res) => {
  try {
    const context = resolveShopAndBranch(req, res);
    if (!context) return;
    const { shopId } = context;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid action ID format' });
    }

    await autoTransitionActionStatuses(shopId);

    const action = await CustomerBehaviorAction.findOne({ _id: id, shopId }).lean();
    if (!action) {
      return res.status(404).json({ success: false, message: 'Retention action not found' });
    }

    return res.status(200).json({
      success: true,
      data: action,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/customer-behavior/actions
 * Create a new retention action
 */
const createRetentionAction = async (req, res) => {
  try {
    const context = resolveShopAndBranch(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { title, description, targetSegment, priority, startDate, endDate, dueDate, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Action title is required and must not be empty',
      });
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Action title cannot exceed 200 characters',
      });
    }

    const normSegment = normalizeSegment(targetSegment);
    if (!normSegment || !VALID_SEGMENTS.includes(normSegment)) {
      return res.status(400).json({
        success: false,
        message: `Target segment is required and must be one of: ${VALID_SEGMENTS.join(', ')}`,
      });
    }

    const resolvedPriority = priority ? String(priority).trim() : 'Medium';
    if (!VALID_PRIORITIES.includes(resolvedPriority)) {
      return res.status(400).json({
        success: false,
        message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
      });
    }

    let resolvedStatus = status ? String(status).trim() : 'Planned';
    if (!VALID_STATUSES.includes(resolvedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    let parsedStartDate = null;
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (Number.isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be a valid date',
        });
      }
    }

    let parsedEndDate = null;
    const rawEnd = endDate !== undefined ? endDate : dueDate;
    if (rawEnd) {
      parsedEndDate = new Date(rawEnd);
      if (Number.isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'End date must be a valid date',
        });
      }
    }

    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date',
      });
    }

    // Auto-lifecycle progression based on schedule dates:
    // If end date has arrived/passed -> Completed
    // If start date has arrived/passed (and end date is future/null) -> In Progress
    const now = new Date();
    if (parsedEndDate && parsedEndDate <= now) {
      resolvedStatus = 'Completed';
    } else if (parsedStartDate && parsedStartDate <= now) {
      if (resolvedStatus === 'Planned') {
        resolvedStatus = 'In Progress';
      }
    }

    // Attempt to lookup creator name if available
    let createdByName = '';
    if (req.user?.id) {
      try {
        const creatorUser = await User.findById(req.user.id).select('name').lean();
        if (creatorUser?.name) {
          createdByName = creatorUser.name;
        }
      } catch (ignored) {
        // Fallback gracefully without throwing
      }
    }

    const action = new CustomerBehaviorAction({
      shopId,
      branchId,
      title: trimmedTitle,
      description: description ? String(description).trim() : '',
      targetSegment: normSegment,
      priority: resolvedPriority,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      dueDate: parsedEndDate,
      status: resolvedStatus,
      createdBy: req.user?.id || null,
      createdByName,
    });

    await action.save();

    return res.status(201).json({
      success: true,
      message: 'Retention action created successfully',
      data: action,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/customer-behavior/actions/:id
 * Update an existing retention action
 */
const updateRetentionAction = async (req, res) => {
  try {
    const context = resolveShopAndBranch(req, res);
    if (!context) return;
    const { shopId } = context;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid action ID format' });
    }

    const action = await CustomerBehaviorAction.findOne({ _id: id, shopId });
    if (!action) {
      return res.status(404).json({ success: false, message: 'Retention action not found' });
    }

    const { title, description, targetSegment, priority, startDate, endDate, dueDate, status } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Action title cannot be empty',
        });
      }
      if (title.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Action title cannot exceed 200 characters',
        });
      }
      action.title = title.trim();
    }

    if (description !== undefined) {
      action.description = typeof description === 'string' ? description.trim() : '';
    }

    if (targetSegment !== undefined) {
      const normSegment = normalizeSegment(targetSegment);
      if (!VALID_SEGMENTS.includes(normSegment)) {
        return res.status(400).json({
          success: false,
          message: `Target segment must be one of: ${VALID_SEGMENTS.join(', ')}`,
        });
      }
      action.targetSegment = normSegment;
    }

    if (priority !== undefined) {
      const p = String(priority).trim();
      if (!VALID_PRIORITIES.includes(p)) {
        return res.status(400).json({
          success: false,
          message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        });
      }
      action.priority = p;
    }

    if (status !== undefined) {
      const s = String(status).trim();
      if (!VALID_STATUSES.includes(s)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
      }
      action.status = s;
    }

    if (startDate !== undefined) {
      if (!startDate) {
        action.startDate = null;
      } else {
        const parsed = new Date(startDate);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Start date must be a valid date or null',
          });
        }
        action.startDate = parsed;
      }
    }

    const rawEnd = endDate !== undefined ? endDate : dueDate;
    if (rawEnd !== undefined) {
      if (!rawEnd) {
        action.endDate = null;
        action.dueDate = null;
      } else {
        const parsed = new Date(rawEnd);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'End date must be a valid date or null',
          });
        }
        action.endDate = parsed;
        action.dueDate = parsed;
      }
    }

    if (action.startDate && action.endDate && action.endDate < action.startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date',
      });
    }

    // Auto-lifecycle progression based on schedule dates:
    const now = new Date();
    const effectiveEnd = action.endDate || action.dueDate;
    if (effectiveEnd && effectiveEnd <= now) {
      action.status = 'Completed';
    } else if (action.startDate && action.startDate <= now) {
      if (action.status === 'Planned') {
        action.status = 'In Progress';
      }
    }

    action.updatedBy = req.user?.id || null;

    await action.save();

    return res.status(200).json({
      success: true,
      message: 'Retention action updated successfully',
      data: action,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/customer-behavior/actions/:id
 * Delete a retention action after confirmation
 */
const deleteRetentionAction = async (req, res) => {
  try {
    const context = resolveShopAndBranch(req, res);
    if (!context) return;
    const { shopId } = context;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid action ID format' });
    }

    const action = await CustomerBehaviorAction.findOne({ _id: id, shopId });
    if (!action) {
      return res.status(404).json({ success: false, message: 'Retention action not found' });
    }

    await CustomerBehaviorAction.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Retention action deleted successfully',
      data: { id },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRetentionActions,
  getRetentionActionById,
  createRetentionAction,
  updateRetentionAction,
  deleteRetentionAction,
};
