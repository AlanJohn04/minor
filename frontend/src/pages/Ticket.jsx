import { QRCodeSVG } from "qrcode.react";

function Ticket() {
  const data = "USER123|STOP_A|STOP_D";

  return (
    <div className="qr-container">
      <h2>Digital Ticket</h2>
      <QRCodeSVG value={data} size={180} level="H" includeMargin={true} />
      <p>Scan this code upon entry/exit</p>
    </div>
  );
}

export default Ticket;