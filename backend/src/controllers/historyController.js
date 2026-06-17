const mongoose = require("mongoose");
const Cart = require("../models/cart");
const History = require("../models/history");
const User = require("../models/user");
const Product = require("../models/product");
const ShopsData = require("../models/shopsData");
const { sendSms } = require("../services/smsService");
const {
  buildDigitalReceiptUrl,
  buildHistoryReceiptSmsMessage,
} = require("../utils/historyReceiptSms");

const PAYMENT_OPTIONS = History.PAYMENT_OPTIONS;

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function requireShopId(req, res) {
  const shopId = normalizeShopId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: "Shop id is required" });
    return null;
  }
  return shopId;
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function parsePagination(query) {
  const pageRaw = parseInt(String(query?.page ?? "1"), 10);
  const limitRaw = parseInt(String(query?.limit ?? "20"), 10);

  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const limit = Number.isNaN(limitRaw)
    ? 20
    : Math.min(100, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function parseDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

const ORDER_ID_MIN_LENGTH = 6;
const ORDER_ID_LENGTH = 8;
const ORDER_ID_CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function buildRandomOrderId(length = ORDER_ID_LENGTH) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += ORDER_ID_CHARS[Math.floor(Math.random() * ORDER_ID_CHARS.length)];
  }
  return value;
}

async function generateShopOrderId(shopId) {
  const normalizedShopId = normalizeShopId(shopId);
  const MAX_ATTEMPTS = 12;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = buildRandomOrderId(ORDER_ID_LENGTH);
    if (candidate.length < ORDER_ID_MIN_LENGTH) continue;

    const exists = await History.exists({
      shopId: normalizedShopId,
      orderId: candidate,
    });
    if (!exists) {
      return candidate;
    }
  }

  const fallback =
    `${Date.now().toString(36).toUpperCase()}${buildRandomOrderId(2)}`.slice(
      -ORDER_ID_LENGTH,
    );
  const exists = await History.exists({
    shopId: normalizedShopId,
    orderId: fallback,
  });
  if (exists) {
    throw new Error("Could not generate a unique order id for this shop");
  }

  return fallback;
}

function sanitizeMobile(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

function normalizePaymentOption(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  return PAYMENT_OPTIONS.includes(normalized) ? normalized : null;
}

function normalizeReverseStatus(value) {
  if (value === undefined || value === null || value === "") return null;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "reversed" || normalized === "canceled") return normalized;
  return null;
}

async function sendHistoryReceiptSms({
  shopId,
  customerMobile,
  historyRecord,
  amount,
  totalAmount,
  isDiscount,
  discountedAmount,
  orderId,
}) {
  const shop = await ShopsData.findOne({ shopId })
    .select("shopName sms")
    .lean();
  if (!shop?.sms) {
    return { sent: false, reason: "SMS disabled for shop" };
  }

  const receiptUrl = buildDigitalReceiptUrl(historyRecord._id);
  if (!receiptUrl) {
    return {
      sent: false,
      reason: "DIGITAL_RECEIPT_BASE_URL is not configured",
    };
  }

  const message = buildHistoryReceiptSmsMessage({
    shopName: shop.shopName,
    orderId,
    amount,
    totalAmount,
    isDiscount,
    discountedAmount,
    receiptUrl,
  });
  console.log("1111178887872823723823823923823872893729782738927", message);
  await sendSms({
    to: customerMobile,
    message,
  });

  return { sent: true };
}

function mapHistoryRecord(record) {
  return {
    _id: record._id,
    shopId: record.shopId,
    cartId: record.cartId,
    cartNumber: record.cartNumber,
    orderId: record.orderId,
    checkOutTime: record.checkOutTime,
    amount: roundMoney(record.amount),
    isDiscount: Boolean(record.isDiscount),
    discountedAmount: roundMoney(record.discountedAmount ?? 0),
    items: (record.items ?? []).map((item) => ({
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      unitCost: item.unitCost ?? null,
    })),
    totalAmount: roundMoney(record.totalAmount),
    customerName: record.customerName ?? "",
    customerMobile: record.customerMobile ?? "",
    userId: record.userId,
    submittedUserId: record.submittedUserId,
    submittedUserName: record.submittedUserName ?? "",
    paymentOption: record.paymentOption,
    status: record.status ?? "submited",
    isReversed: Boolean(record.isReversed),
    reversedAt: record.reversedAt ?? null,
    reversedUserId: record.reversedUserId ?? null,
    reversedUserName: record.reversedUserName ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildHistoryListFilter(req, shopId) {
  const filter = { shopId };

  const scopeRaw = req.query?.scope;
  const scope =
    scopeRaw === undefined || scopeRaw === null
      ? "mine"
      : String(scopeRaw).trim().toLowerCase();

  if (scope !== "mine" && scope !== "all") {
    return { error: "Scope must be mine or all" };
  }

  if (scope === "mine") {
    filter.submittedUserId = req.user.id;
  }

  const from = parseDate(req.query?.from);
  const to = parseDate(req.query?.to);

  if (from || to) {
    filter.checkOutTime = {};
    if (from) {
      filter.checkOutTime.$gte = startOfDay(from);
    }
    if (to) {
      filter.checkOutTime.$lte = endOfDay(to);
    }
  }

  const paymentOption = normalizePaymentOption(req.query?.paymentOption);
  if (
    req.query?.paymentOption !== undefined &&
    req.query?.paymentOption !== null &&
    req.query?.paymentOption !== ""
  ) {
    if (!paymentOption) {
      return {
        error: `Payment option must be one of: ${PAYMENT_OPTIONS.join(", ")}`,
      };
    }
    filter.paymentOption = paymentOption;
  }

  const orderIdRaw = req.query?.orderId;
  if (
    orderIdRaw !== undefined &&
    orderIdRaw !== null &&
    String(orderIdRaw).trim() !== ""
  ) {
    const orderIdText = String(orderIdRaw).trim().toUpperCase();
    if (orderIdText.length < ORDER_ID_MIN_LENGTH) {
      return {
        error: `Order id filter must be at least ${ORDER_ID_MIN_LENGTH} characters`,
      };
    }
    filter.orderId = orderIdText;
  }

  const cartNumberRaw = req.query?.cartNumber;
  if (
    cartNumberRaw !== undefined &&
    cartNumberRaw !== null &&
    String(cartNumberRaw).trim() !== ""
  ) {
    const cartNumberText = String(cartNumberRaw).trim();
    const cartNumber = Number.parseInt(cartNumberText, 10);

    if (
      Number.isInteger(cartNumber) &&
      cartNumber > 0 &&
      String(cartNumber) === cartNumberText
    ) {
      filter.cartNumber = cartNumber;
    } else {
      return { error: "Cart number filter must be a positive whole number" };
    }
  }

  const mobileRaw = req.query?.mobile ?? req.query?.customerMobile;
  if (
    mobileRaw !== undefined &&
    mobileRaw !== null &&
    String(mobileRaw).trim() !== ""
  ) {
    const mobile = sanitizeMobile(mobileRaw);
    if (!mobile) {
      return { error: "Mobile number filter must contain digits" };
    }
    filter.customerMobile = { $regex: mobile, $options: "i" };
  }

  return { filter, scope };
}

const createHistory = async (req, res) => {
  try {
    console.log("1111178887872823723823823923823872893729782738927", req.body);
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const {
      sessionId,
      customerName,
      customerMobile,
      paymentOption: paymentOptionRaw,
    } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid session id is required" });
    }

    const mobile = sanitizeMobile(customerMobile);
    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Customer phone number is required" });
    }

    const paymentOption = normalizePaymentOption(paymentOptionRaw ?? "cash");
    if (!paymentOption) {
      return res.status(400).json({
        success: false,
        message: `Payment option must be one of: ${PAYMENT_OPTIONS.join(", ")}`,
      });
    }

    const cart = await Cart.findOne({
      shopId,
      user: req.user.id,
      sessionId,
      status: "proceed",
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message:
          "Proceed cart session not found. Complete cart checkout first.",
      });
    }

    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart has no items for history",
      });
    }

    const existingHistory = await History.findOne({
      shopId,
      cartId: cart.sessionId,
    }).lean();
    if (existingHistory) {
      return res.status(409).json({
        success: false,
        message: "History record already exists for this cart",
        data: mapHistoryRecord(existingHistory),
      });
    }

    const submittedUser = await User.findById(req.user.id)
      .select("name")
      .lean();
    const submittedUserName = submittedUser?.name?.trim() || "User";

    const amount = roundMoney(cart.totalPrice);
    const discountedAmount = roundMoney(cart.discountedAmount ?? 0);
    const totalAmount = roundMoney(amount - discountedAmount);
    const checkOutTime = new Date();
    const orderId = await generateShopOrderId(shopId);

    const history = await History.create({
      shopId,
      cartId: cart.sessionId,
      cartNumber: cart.cartNumber,
      orderId,
      checkOutTime,
      amount,
      isDiscount: Boolean(cart.isDiscount),
      discountedAmount,
      items: cart.items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        qty: item.quantity,
        unitCost: item.unitCost ?? null,
      })),
      totalAmount,
      customerName: String(customerName ?? "").trim(),
      customerMobile: mobile,
      userId: cart.user,
      submittedUserId: req.user.id,
      submittedUserName,
      paymentOption,
    });

    let smsStatus = { sent: false, reason: "Not attempted" };
    try {

      console.log("1111178887872823723823823923823872893729782738927",);
      smsStatus = await sendHistoryReceiptSms({
        shopId,
        customerMobile: mobile,
        historyRecord: history,
        amount,
        totalAmount,
        isDiscount: Boolean(cart.isDiscount),
        discountedAmount,
        orderId,
      });
    } catch (smsError) {
      console.log("error in createHistory receipt SMS", smsError.message);
      smsStatus = {
        sent: false,
        reason: smsError.message || "SMS send failed",
      };
    }

    res.status(201).json({
      success: true,
      sessionId,
      data: mapHistoryRecord(history),
      message: "History record created",
      sms: smsStatus,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "History record already exists for this cart",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const listQuery = buildHistoryListFilter(req, shopId);
    if (listQuery.error) {
      return res.status(400).json({ success: false, message: listQuery.error });
    }

    const { filter, scope } = listQuery;
    const { page, limit, skip } = parsePagination(req.query);

    const [total, records] = await Promise.all([
      History.countDocuments(filter),
      History.find(filter)
        .sort({ checkOutTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      scope,
      data: records.map(mapHistoryRecord),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      message: "History loaded",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function getTodayCheckoutRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getStatsDateRange(query) {
  const start = parseDate(query?.from);
  const end = parseDate(query?.to);

  if (start && end && end > start) {
    return { start, end };
  }

  return getTodayCheckoutRange();
}

function mapSalesStats(rows) {
  const row = rows[0];

  return {
    totalSales: roundMoney(row?.totalSales ?? 0),
    orderCount: row?.orderCount ?? 0,
  };
}

const getTodayStats = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const { start, end } = getStatsDateRange(req.query);
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const dateFilter = {
      shopId,
      checkOutTime: { $gte: start, $lt: end },
    };

    const [mineRows, allRows] = await Promise.all([
      History.aggregate([
        { $match: { ...dateFilter, submittedUserId: userId } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      History.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        mine: mapSalesStats(mineRows),
        all: mapSalesStats(allRows),
      },
      message: "Today sales stats loaded",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const reversedSalesData = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const historyId = req.params?.id ?? req.body?.id ?? req.body?.historyId;
    if (!historyId || !mongoose.Types.ObjectId.isValid(String(historyId))) {
      return res.status(400).json({
        success: false,
        message: "Valid history id is required",
      });
    }

    const requestedStatus = normalizeReverseStatus(req.body?.status);
    if (!requestedStatus) {
      return res.status(400).json({
        success: false,
        message: "Status must be canceled or reversed",
      });
    }

    const reversedUser = await User.findById(req.user.id).select("name").lean();
    const reversedUserName = reversedUser?.name?.trim() || "User";
    const reversedAt = new Date();

    let updatedHistory = null;
    await session.withTransaction(async () => {
      const history = await History.findOne({
        _id: historyId,
        shopId,
      }).session(session);

      if (!history) {
        throw new Error("HISTORY_NOT_FOUND");
      }

      if (
        history.isReversed ||
        history.status === "reversed" ||
        history.status === "canceled"
      ) {
        throw new Error("HISTORY_ALREADY_REVERSED");
      }

      const itemEntries = Array.isArray(history.items) ? history.items : [];
      for (const item of itemEntries) {
        if (!item?.productId) continue;

        const product = await Product.findOne({
          _id: item.productId,
          shopId,
        }).session(session);
        if (!product) continue;

        if (!product.isInventoryAvailable) continue;

        const restoreQty = Number(item.qty) || 0;
        if (restoreQty <= 0) continue;

        const currentQty = Number(product.qty) || 0;
        product.qty = currentQty + restoreQty;
        await product.save({ session });
      }

      history.status = requestedStatus;
      history.isReversed = true;
      history.reversedAt = reversedAt;
      history.reversedUserId = req.user.id;
      history.reversedUserName = reversedUserName;
      await history.save({ session });

      updatedHistory = history.toObject();
    });

    if (!updatedHistory) {
      return res.status(500).json({
        success: false,
        message: "Could not reverse sales data",
      });
    }

    return res.status(200).json({
      success: true,
      data: mapHistoryRecord(updatedHistory),
      message: "Sales data reversed successfully",
    });
  } catch (error) {
    if (error?.message === "HISTORY_NOT_FOUND") {
      return res
        .status(404)
        .json({ success: false, message: "History record not found" });
    }
    if (error?.message === "HISTORY_ALREADY_REVERSED") {
      return res
        .status(409)
        .json({ success: false, message: "History record already reversed" });
    }
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createHistory,
  getHistory,
  getTodayStats,
  reversedSalesData,
};
