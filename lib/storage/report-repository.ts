import { localReportRepository } from "@/lib/storage/local-report-repository";
import type {
  HalleusStorageDriver,
  ReportRepository,
} from "@/types/storage";

export const activeStorageDriver: HalleusStorageDriver = "local";

export function getReportRepository(): ReportRepository {
  return localReportRepository;
}
