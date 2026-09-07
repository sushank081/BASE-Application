export interface DailyMaterialReportRow {
  report_date: string;
  formatted_date: string;

  // Material Columns
  BB000000002862_BAK: number;
  BB000000002862_LG: number;
  BB000000002862_TOTAL: number;

  BB000000002500_BAK: number;
  BB000000002500_LG: number;
  BB000000002500_TOTAL: number;

  BB000000004656_BAK: number;
  BB000000004656_LG: number;
  BB000000004656_TOTAL: number;

  BB000000004655_BAK: number;
  BB000000004655_LG: number;
  BB000000004655_TOTAL: number;

  BB000000004657_BAK: number;
  BB000000004657_LG: number;
  BB000000004657_TOTAL: number;

  BB000000005500_BAK: number;
  BB000000005500_LG: number;
  BB000000005500_TOTAL: number;

  BBM00000000001_BAK: number;
  BBM00000000001_LG: number;
  BBM00000000001_TOTAL: number;

  SS000000001570_BAK: number;
  SS000000001570_LG: number;
  SS000000001570_TOTAL: number;

  SS000000001584_BAK: number;
  SS000000001584_LG: number;
  SS000000001584_TOTAL: number;

  BB000000005230_BAK: number;
  BB000000005230_LG: number;
  BB000000005230_TOTAL: number;

  BB000000005233_BAK: number;
  BB000000005233_LG: number;
  BB000000005233_TOTAL: number;

  BB000000005359_BAK: number;
  BB000000005359_LG: number;
  BB000000005359_TOTAL: number;

  BB000000004675_BAK: number;
  BB000000004675_LG: number;
  BB000000004675_TOTAL: number;

  // Daily Totals
  Daily_Total_BAK: number;
  Daily_Total_LG: number;
  Daily_Total_All: number;
}

export interface DailyMaterialReportResponse {
  status: string;
  message: string;
  record_count: number;
  data: DailyMaterialReportRow[];
}