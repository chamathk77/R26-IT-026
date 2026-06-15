const mongoose = require('mongoose');
const SalePerson = require('../models/salePerson');
const User = require('../models/user');
const {
  publicImagePath,
  unlinkSalePersonImageIfLocal,
} = require('../middleware/uploadSalePersonImage');

function invalidIdResponse(res) {
  return res.status(400).json({ message: 'Invalid sale person id', success: false });
}

function getRequestShopId(req) {
  return req.user?.shopId ? String(req.user.shopId).trim().toUpperCase() : '';
}

function normalizeSalePersonId(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function mapSalePersonRecord(record) {
  return {
    _id: record._id,
    shopId: record.shopId,
    salePersonId: record.salePersonId,
    firstName: record.firstName,
    lastName: record.lastName,
    position: record.position,
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

const createSalePerson = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('shopId').lean();
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found', success: false });
    }

    const shopId = user.shopId ? String(user.shopId).trim().toUpperCase() : '';
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const { salePersonId, firstName, lastName, position } = req.body;
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

    const salePerson = await SalePerson.create({
      shopId,
      salePersonId: normalizedSalePersonId,
      firstName: firstNameTrimmed,
      lastName: lastNameTrimmed,
      position: positionTrimmed,
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
    const shopId = getRequestShopId(req);
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const salePersons = await SalePerson.find({ shopId }).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: salePersons.length,
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

    const shopId = getRequestShopId(req);
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const salePerson = await SalePerson.findOne({ _id: id, shopId }).lean();
    if (!salePerson) {
      return res.status(404).json({ message: 'Sales person not found', success: false });
    }

    return res.json({ success: true, data: mapSalePersonRecord(salePerson) });
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

    const shopId = getRequestShopId(req);
    if (!shopId) {
      rollbackUploadedFile(req);
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

    const existing = await SalePerson.findOne({ _id: id, shopId });
    if (!existing) {
      rollbackUploadedFile(req);
      return res.status(404).json({ message: 'Sales person not found', success: false });
    }

    const { salePersonId, firstName, lastName, position } = req.body;
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

    const shopId = getRequestShopId(req);
    if (!shopId) {
      return res.status(400).json({ message: 'Shop id is required', success: false });
    }

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
