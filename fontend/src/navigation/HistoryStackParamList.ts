import { HistoryRecord } from '../type/history';

export type HistoryStackParamList = {
  HistoryList: undefined;
  HistoryDetails: { record: HistoryRecord };
};
