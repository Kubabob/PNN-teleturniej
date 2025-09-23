interface SerialPortRequestOptions {
  filters?: SerialPortFilter[];
}

interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
  bufferSize?: number;
  flowControl?: string;
}

interface SerialPort {
  open: (options: SerialOptions) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream;
  writable: WritableStream;
  getInfo: () => SerialPortInfo;
}

interface SerialPortInfo {
  usbVendorId: number;
  usbProductId: number;
}

interface Navigator {
  serial: {
    requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>;
    getPorts: () => Promise<SerialPort[]>;
  };
}
