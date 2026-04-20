#include <Adafruit_GFX.h>    
#include <Adafruit_ST7789.h> 
#include <SPI.h>
#include <TinyGPS++.h>
#include <WiFi.h>
#include <HTTPClient.h>

// --- WIFI & SERVER CONFIG ---
const char* ssid = "ABC";
const char* password = "alan1234";
const char* serverURL = "http://192.168.137.1:3000/api/scan"; // WINDOWS HOTSPOT IP

// --- TFT PINS ---
#define TFT_CS     5
#define TFT_RST    15
#define TFT_DC     2

Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS, TFT_DC, TFT_RST);

// --- PIN DEFINITIONS ---
const int IR_1 = 26; 
const int IR_2 = 27; 
const int BUZZER_SIG = 4; 
#define RXD2 16
#define TXD2 17

// --- VARIABLES ---
const int MAX_CAPACITY = 21;
int passengerCount = 0;

int state = 0; 
unsigned long timeout = 0;
unsigned long clearTimer = 0; 
unsigned long lastSync = 0;

unsigned long lastBuzzerToggle = 0;
bool buzzerOn = false;
bool gpsLocked = false;

TinyGPSPlus gps;
HardwareSerial neogps(1); 

void setup() {
  Serial.begin(115200);
  neogps.begin(9600, SERIAL_8N1, RXD2, TXD2);
  
  pinMode(IR_1, INPUT);
  pinMode(IR_2, INPUT);
  pinMode(BUZZER_SIG, OUTPUT);

  // TFT Initialize
  tft.init(240, 320);   
  tft.setRotation(3);   
  tft.fillScreen(ST77XX_BLACK);
  
  tft.setTextColor(ST77XX_WHITE);
  tft.setTextSize(2);
  tft.setCursor(60, 10);
  tft.println("SMART BUS SYSTEM");
  tft.drawFastHLine(0, 35, 320, ST77XX_BLUE);
  
  tft.setCursor(20, 55);
  tft.println("PASSENGER COUNT:");
  tft.setCursor(20, 145);
  tft.println("GPS LOCATION:");

  tone(BUZZER_SIG, 1000, 200); 
  
  // WiFi Init
  WiFi.begin(ssid, password);
  updateDisplay(); 
}

void sendData() {
  Serial.println("--- sendData() called ---");
  Serial.print("WiFi Status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");
  
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");

    String json = "{";
    json += "\"qr\":\"BUS_UPDATE\",";
    json += "\"lat\":" + String(gps.location.lat(), 6) + ",";
    json += "\"lng\":" + String(gps.location.lng(), 6) + ",";
    json += "\"passenger_count\":" + String(passengerCount);
    json += "}";

    Serial.print("Sending to: ");
    Serial.println(serverURL);
    Serial.print("JSON: ");
    Serial.println(json);

    int httpCode = http.POST(json);
    
    Serial.print("HTTP Response Code: ");
    Serial.println(httpCode);
    
    if (httpCode > 0) {
      Serial.println("Response: " + http.getString());
    } else {
      Serial.println("ERROR: " + http.errorToString(httpCode));
    }
    
    http.end();
  } else {
    Serial.println("SKIPPED - WiFi not connected");
  }
}

void loop() {
  // 1. GPS Feed
  while (neogps.available() > 0) {
    gps.encode(neogps.read());
  }

  // 2. Periodic Sync (every 10 seconds)
  if (millis() - lastSync > 10000) {
    if (WiFi.status() != WL_CONNECTED) {
       WiFi.begin(ssid, password);
    }
    sendData(); // Sends current count and location
    lastSync = millis();
  }

  // 3. GPS Lock Notification
  if (!gpsLocked && gps.location.isValid()) {
    gpsLocked = true;
    tone(BUZZER_SIG, 2000, 1000); 
    updateDisplay(); 
  }

  int s1 = digitalRead(IR_1);
  int s2 = digitalRead(IR_2);

  // --- PASSENGER LOGIC ---
  if (state == 0) {
    if (s1 == LOW) { state = 1; timeout = millis(); } 
    else if (s2 == LOW) { state = 2; timeout = millis(); } 
  }
  else if (state == 1) {
    if (s2 == LOW) {
      if (passengerCount < MAX_CAPACITY) passengerCount++;
      updateDisplay(); 
      sendData(); // Sync count change
      state = 3; 
      clearTimer = millis(); 
    }
  }
  else if (state == 2) {
    if (s1 == LOW) {
      if (passengerCount > 0) passengerCount--;
      updateDisplay(); 
      sendData(); // Sync count change
      state = 3; 
      clearTimer = millis(); 
    }
  }
  else if (state == 3) {
    if (s1 == HIGH && s2 == HIGH) {
      if (millis() - clearTimer > 500) {
        state = 0; 
      }
    } else {
      clearTimer = millis(); 
    }
  }

  if ((state == 1 || state == 2) && (millis() - timeout > 1500)) {
    state = 0;
  }

  // --- BUZZER SAFETY ---
  if (passengerCount >= MAX_CAPACITY) {
    if (millis() - lastBuzzerToggle >= 400) {
      buzzerOn = !buzzerOn;
      if (buzzerOn) tone(BUZZER_SIG, 1500); else noTone(BUZZER_SIG);
      lastBuzzerToggle = millis();
    }
  } else {
    noTone(BUZZER_SIG);
    buzzerOn = false;
  }
}

void updateDisplay() {
  tft.fillRect(20, 85, 280, 50, ST77XX_BLACK); 
  tft.fillRect(20, 175, 280, 55, ST77XX_BLACK);

  tft.setCursor(40, 85);
  tft.setTextSize(6); 
  if (passengerCount >= MAX_CAPACITY) tft.setTextColor(ST77XX_RED);
  else tft.setTextColor(ST77XX_GREEN);
  tft.print(passengerCount);
  tft.setTextSize(3);
  tft.print(" / "); tft.print(MAX_CAPACITY);

  tft.setTextSize(2);
  tft.setCursor(25, 175);
  if (gpsLocked) {
    tft.setTextColor(ST77XX_YELLOW);
    tft.print("LAT: "); tft.println(gps.location.lat(), 5);
    tft.setCursor(25, 205);
    tft.print("LNG: "); tft.println(gps.location.lng(), 5);
  } else {
    tft.setTextColor(ST77XX_ORANGE);
    tft.println("Connecting to Sat...");
  }
  
  // WiFi Status indicator
  tft.setTextSize(1);
  tft.setCursor(260, 40);
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(ST77XX_GREEN);
    tft.print("WIFI OK");
  } else {
    tft.setTextColor(ST77XX_RED);
    tft.print("WIFI NO");
  }
}
