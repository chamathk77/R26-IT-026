const mongoose = require('mongoose');
const TrialCronReport = require('../../models/trialCronReport');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatReportSummary(report) {
  return {
    _id: report._id,
    reportDate: report.reportDate,
    checkedAt: report.checkedAt,
    schedule: report.schedule,
    timezone: report.timezone,
    candidatesFound: report.candidatesFound,
    expiredCount: report.expiredCount,
    skippedCount: report.skippedCount,
    errorsCount: report.errorsCount,
    smsSentCount: report.smsSentCount,
    smsFailedCount: report.smsFailedCount,
    runStatus: report.runStatus,
    fatalError: report.fatalError,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function formatReportDetail(report) {
  return {
    ...formatReportSummary(report),
    reportData: report.reportData ?? {
      expired: [],
      skipped: [],
      errors: [],
    },
  };
}

function buildListFilter(query) {
  const filter = {};

  if (query.runStatus) {
    const runStatus = String(query.runStatus).trim();
    if (['success', 'partial', 'failed'].includes(runStatus)) {
      filter.runStatus = runStatus;
    }
  }

  const fromDate = query.fromDate ? String(query.fromDate).trim() : '';
  const toDate = query.toDate ? String(query.toDate).trim() : '';

  if (fromDate && REPORT_DATE_PATTERN.test(fromDate)) {
    filter.reportDate = { ...(filter.reportDate || {}), $gte: fromDate };
  }
  if (toDate && REPORT_DATE_PATTERN.test(toDate)) {
    filter.reportDate = { ...(filter.reportDate || {}), $lte: toDate };
  }

  if (query.reportDate) {
    const reportDate = String(query.reportDate).trim();
    if (REPORT_DATE_PATTERN.test(reportDate)) {
      filter.reportDate = reportDate;
    }
  }

  return filter;
}

const listTrialCronReports = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;
    const includeDetails = req.query.includeDetails === 'true';

    const filter = buildListFilter(req.query);

    const [reports, total] = await Promise.all([
      TrialCronReport.find(filter)
        .sort({ reportDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TrialCronReport.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      count: reports.length,
      reports: reports.map((report) =>
        includeDetails ? formatReportDetail(report) : formatReportSummary(report),
      ),
    });
  } catch (error) {
    console.log('error in listTrialCronReports', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTrialCronReport = async (req, res) => {
  try {
    const { reportKey } = req.params;
    const key = String(reportKey || '').trim();

    if (!key) {
      return res.status(400).json({ success: false, message: 'Report id or date is required' });
    }

    let report = null;

    if (REPORT_DATE_PATTERN.test(key)) {
      report = await TrialCronReport.findOne({ reportDate: key }).lean();
    } else if (mongoose.Types.ObjectId.isValid(key)) {
      report = await TrialCronReport.findById(key).lean();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Report key must be a valid reportDate (YYYY-MM-DD) or document id',
      });
    }

    if (!report) {
      return res.status(404).json({ success: false, message: 'Trial cron report not found' });
    }

    res.status(200).json({
      success: true,
      report: formatReportDetail(report),
    });
  } catch (error) {
    console.log('error in getTrialCronReport', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listTrialCronReports,
  getTrialCronReport,
};
