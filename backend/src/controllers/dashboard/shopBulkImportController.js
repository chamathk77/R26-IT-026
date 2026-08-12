const ShopsData = require('../../models/shopsData');
const User = require('../../models/user');
const Branch = require('../../models/branch');
const BulkProductImportResult = require('../../models/bulkProductImportResult');
const {
  runBulkProductImport,
  mapBulkImportResultRecord,
  deleteShopCatalogData,
  getExpectedColumns,
} = require('../../services/bulkProductImportService');

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : '';
}

async function findShopById(shopId) {
  return ShopsData.findOne({ shopId }).lean();
}

async function resolveShopOwnerUser(shopId) {
  const owner = await User.findOne({ shopId, role: 'owner' }).select('_id name').lean();
  if (owner) return owner;

  const admin = await User.findOne({ shopId, role: 'admin' }).select('_id name').lean();
  if (admin) return admin;

  return User.findOne({ shopId }).select('_id name').lean();
}

async function resolveDefaultBranchId(shopId, preferredBranchId) {
  const normalizedPreferred = preferredBranchId
    ? String(preferredBranchId).trim().toUpperCase()
    : '';

  if (normalizedPreferred) {
    const preferred = await Branch.findOne({ shopId, branchId: normalizedPreferred })
      .select('branchId')
      .lean();
    if (preferred) {
      return String(preferred.branchId).trim().toUpperCase();
    }
  }

  const mainBranch = await Branch.findOne({ shopId, isMainBranch: true })
    .select('branchId')
    .lean();
  if (mainBranch) {
    return String(mainBranch.branchId).trim().toUpperCase();
  }

  const activeBranch = await Branch.findOne({ shopId, isActive: true })
    .select('branchId')
    .lean();
  if (activeBranch) {
    return String(activeBranch.branchId).trim().toUpperCase();
  }

  const anyBranch = await Branch.findOne({ shopId }).select('branchId').lean();
  return anyBranch ? String(anyBranch.branchId).trim().toUpperCase() : '';
}

async function buildDashboardImportContext(req) {
  const shopId = normalizeShopId(req.params?.shopId);
  if (!shopId) {
    return {
      error: {
        status: 400,
        body: { success: false, message: 'Shop id is required' },
      },
    };
  }

  const shop = await findShopById(shopId);
  if (!shop) {
    return {
      error: {
        status: 404,
        body: { success: false, message: 'Shop not found' },
      },
    };
  }

  const ownerUser = await resolveShopOwnerUser(shopId);
  if (!ownerUser) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message:
            'No shop user account found for this shop. Create at least one owner/admin user before bulk upload.',
        },
      },
    };
  }

  const branchId = await resolveDefaultBranchId(shopId, req.body?.branchId);
  const dashboardName = String(req.user?.name || 'Dashboard user').trim() || 'Dashboard user';

  return {
    shop,
    shopId,
    branchId,
    userId: ownerUser._id,
    createdByName: String(ownerUser.name || '').trim() || dashboardName,
    importedByUserId: ownerUser._id,
    importedByName: `Dashboard: ${dashboardName}`,
  };
}

const getShopBulkImportTemplate = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params?.shopId);
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const shop = await findShopById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    const warrantyModule = Boolean(shop.warrantyModule);
    const expectedColumns = getExpectedColumns(warrantyModule);

    const sampleRows = [
      {
        productName: warrantyModule ? 'Brake Pad Set' : 'Chicken Fried Rice',
        categoryName: warrantyModule ? 'Brake Parts' : 'Main Dishes',
        type: 'product',
        amount: warrantyModule ? 4500 : 850,
        cost: warrantyModule ? 3200 : 420,
        isInventoryAvailable: warrantyModule ? true : false,
        openingQty: warrantyModule ? 12 : '',
        barcode: warrantyModule ? '4790012345678' : '',
        productNumber: warrantyModule ? 'BP-101' : '101',
        ...(warrantyModule
          ? { warrantyAvailable: true, warrantyMonths: 12 }
          : {}),
      },
      {
        productName: warrantyModule ? 'Engine Oil Filter' : 'Mineral Water 500ml',
        categoryName: warrantyModule ? 'Filters' : 'Beverages',
        type: 'product',
        amount: warrantyModule ? 850 : 120,
        cost: warrantyModule ? 520 : 70,
        isInventoryAvailable: true,
        openingQty: warrantyModule ? 30 : 24,
        barcode: warrantyModule ? '' : '4790012345678',
        productNumber: warrantyModule ? 'FL-102' : '102',
        ...(warrantyModule
          ? { warrantyAvailable: false, warrantyMonths: '' }
          : {}),
      },
      {
        productName: warrantyModule ? 'Labour Charge' : 'Table Service Charge',
        categoryName: 'Services',
        type: 'service',
        amount: '',
        cost: '',
        isInventoryAvailable: false,
        openingQty: '',
        barcode: '',
        productNumber: '',
        ...(warrantyModule
          ? { warrantyAvailable: '', warrantyMonths: '' }
          : {}),
      },
    ];

    const notes = [
      'Keep the column headers exactly as shown in expectedColumns.',
      'type must be product or service.',
      'isInventoryAvailable accepts true/false, yes/no, or 1/0.',
      'productNumber is optional; when provided it must be unique in the file and unique per shop.',
      'For service rows, leave amount/cost/openingQty/barcode empty unless amount is optional.',
      'New categories are created automatically when categoryName does not exist.',
      'Inventory stock uses the shop main branch when openingQty is provided.',
    ];

    if (warrantyModule) {
      notes.push(
        'warrantyAvailable accepts true/false, yes/no, or 1/0. Leave empty to treat as false.',
        'warrantyMonths is required when warrantyAvailable is true and must be a whole number greater than 0.',
        'Warranty columns apply to product rows only.',
      );
    }

    return res.status(200).json({
      success: true,
      warrantyModule,
      expectedColumns,
      sampleRows,
      notes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load bulk import template',
    });
  }
};

const bulkImportShopCatalog = async (req, res) => {
  try {
    const context = await buildDashboardImportContext(req);
    if (context.error) {
      return res.status(context.error.status).json(context.error.body);
    }

    const { columns, rows } = req.body ?? {};
    const result = await runBulkProductImport({
      shopId: context.shopId,
      branchId: context.branchId,
      userId: context.userId,
      createdByName: context.createdByName,
      importedByUserId: context.importedByUserId,
      importedByName: context.importedByName,
      columns,
      rows,
      warrantyModule: Boolean(context.shop.warrantyModule),
    });

    return res.status(result.status).json({
      ...result.body,
      shopId: context.shopId,
      branchIdUsed: context.branchId || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Bulk import failed',
    });
  }
};

const getShopBulkImportResult = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params?.shopId);
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const shop = await findShopById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    const record = await BulkProductImportResult.findOne({ shopId }).sort({ updatedAt: -1 }).lean();
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No bulk import result found for this shop',
      });
    }

    return res.status(200).json({
      ...mapBulkImportResultRecord(record),
      shopId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch bulk import result',
    });
  }
};

const dismissShopBulkImportResult = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params?.shopId);
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    const result = await BulkProductImportResult.deleteMany({ shopId });
    return res.status(200).json({
      success: true,
      dismissed: result.deletedCount ?? 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to dismiss bulk import result',
    });
  }
};

const deleteShopBulkImportCatalog = async (req, res) => {
  try {
    const shopId = normalizeShopId(req.params?.shopId);
    const confirmShopId = normalizeShopId(req.body?.confirmShopId);

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop id is required',
      });
    }

    if (!confirmShopId || confirmShopId !== shopId) {
      return res.status(400).json({
        success: false,
        message: 'confirmShopId must match the shop id',
      });
    }

    const shop = await findShopById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found',
      });
    }

    const result = await deleteShopCatalogData(shopId);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete shop catalog data',
    });
  }
};

module.exports = {
  getShopBulkImportTemplate,
  bulkImportShopCatalog,
  getShopBulkImportResult,
  dismissShopBulkImportResult,
  deleteShopBulkImportCatalog,
};
