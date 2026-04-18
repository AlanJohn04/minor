#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

// --- CONFIGURATION ---
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
// IMPORTANT: Change this to your computer's IP address (run 'ipconfig' in cmd)
const char* serverURL = "http://192.168.1.10:3000/api/scan"; 

#define IR_PIN 14
#define LED_PIN 25
#define BUZZER_PIN 26

TinyGPSPlus gps;
HardwareSerial gpsSerial(1); // RX: 16, TX: 17
HardwareSerial qrSerial(2);  // RX: 4, TX: -1

void setup() {
  Serial.begin(115200);
  Serial.println("Starting Smart Bus System...");

  pinMode(IR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  qrSerial.begin(9600, SERIAL_8N1, 4, -1);

  connectWiFi();
}

void connectWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void successSignal() {
  digitalWrite(LED_PIN, HIGH);
  tone(BUZZER_PIN, 1000);
  delay(300);
  digitalWrite(LED_PIN, LOW);
  noTone(BUZZER_PIN);
}

void errorSignal() {
  for (int i = 0; i < 2; i++) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 500);
    delay(150);
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
    delay(100);
  }
}

void loop() {
  // 1. Maintain WiFi Connection
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 2. Read GPS Data continuously
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // 3. Scan QR Code
  if (qrSerial.available()) {
    String qr = qrSerial.readStringUntil('\n');
    qr.trim();
    
    if (qr.length() > 0) {
      Serial.println("QR Scanned: " + qr);
      
      // Check IR Sensor for passenger detection
      bool passengerDetected = (digitalRead(IR_PIN) == HIGH);
      
      if (passengerDetected) {
        sendDataToServer(qr);
      } else {
        Serial.println("QR scanned but no passenger at door (IR Sensor)");
        errorSignal();
      }
    }
  }
}

void sendDataToServer(String qrData) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");

    float lat = gps.location.isValid() ? gps.location.lat() : 13.0827; // Default to city center if no fix
    float lng = gps.location.isValid() ? gps.location.lng() : 80.2707;

    String json = "{";
    json += "\"qr\":\"" + qrData + "\",";
    json += "\"lat\":" + String(lat, 6) + ",";
    json += "\"lng\":" + String(lng, 6);
    json += "}";

    Serial.println("Sending: " + json);
    int httpCode = http.POST(json);

    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Server Response: " + response);
      
      if (response.indexOf("SUCCESS") >= 0) {
        successSignal();
      } else {
        errorSignal();
      }
    } else {
      Serial.println("HTTP Error: " + String(httpCode));
      errorSignal();
    }
    http.end();
  }
}


