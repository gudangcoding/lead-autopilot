declare module "qrcode-terminal" {
  const qrcode: { generate: (text: string, opts?: any, cb?: (qr: string) => void) => void };
  export default qrcode;
}
