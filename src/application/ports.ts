export interface InstalledApp {
  id: string;
  iconPath: string | null;
}

export interface AppCatalog {
  installed(): Promise<InstalledApp[]>;
  launch(appId: string): Promise<void>;
}

export interface InputSource {
  connected(): Promise<{ port: number; cecName: string | null }[]>;
  onChange(cb: () => void): void;
}

export interface InputSwitcher {
  switchTo(port: number | 'tv'): Promise<void>;
}

export interface WifiStatus {
  read(): Promise<{ ssid: string; signal: number } | null>;
}

export interface Store {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}
