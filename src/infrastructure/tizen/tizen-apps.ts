import type { AppCatalog, InstalledApp } from '@/application/ports';

export class TizenAppCatalog implements AppCatalog {
  installed(): Promise<InstalledApp[]> {
    return new Promise((resolve, reject) => {
      tizen.application.getAppsInfo(
        (apps) =>
          resolve(
            apps.map((a) => ({
              id: a.id,
              iconPath: a.iconPath || null,
            })),
          ),
        reject,
      );
    });
  }

  launch(appId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      tizen.application.launch(appId, resolve, reject);
    });
  }
}
