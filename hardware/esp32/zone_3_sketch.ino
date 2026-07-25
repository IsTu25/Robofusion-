#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// Wokwi provides a virtual WiFi network
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// UPDATE THIS WITH YOUR URL
// Make sure it ends in /api/zones/3/readings/
String serverName = "http://giant-books-think.loca.lt/api/zones/3/readings/";

// Pin Definitions
const int FIRE_PIN = 34; // Potentiometer 1
const int GAS_PIN = 35;  // Potentiometer 2
const int WATER_PIN = 32; // Potentiometer 3
const int PIR_PIN = 33;   // Push Button

String bootId;

void setup() {
  uint32_t r1 = esp_random();
  uint32_t r2 = esp_random();
  uint32_t r3 = esp_random();
  uint32_t r4 = esp_random();
  char uuidStr[37];
  sprintf(uuidStr, "%08x-%04x-%04x-%04x-%04x%08x", r1, r2 >> 16, r2 & 0xFFFF, r3 >> 16, r3 & 0xFFFF, r4);
  bootId = String(uuidStr);


  Serial.begin(115200);
  
  pinMode(PIR_PIN, INPUT_PULLUP);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.println("Connecting to Wokwi-GUEST...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("Connected to WiFi!");
}

void loop() {
  // Read Potentiometers (0 to 4095 on ESP32)
  int fireRaw = analogRead(FIRE_PIN);
  int gasRaw = analogRead(GAS_PIN);
  int waterRaw = analogRead(WATER_PIN);
  
  // Read Button (LOW when pressed due to PULLUP)
  bool pirState = digitalRead(PIR_PIN) == LOW;

  // Map to backend expected ranges:
  // Fire expects 0.0 - 1.0, Gas/Water expect values high enough to trigger thresholds (e.g. 500)
  float fireMapped = (fireRaw / 4095.0) * 1.0;
  
  float gasMapped;
  bool is_warmup = millis() < 30000;
  if (is_warmup) {
    gasMapped = 0.0;
  } else {
    gasMapped = (gasRaw / 4095.0) * 500.0;
  }
  
  float waterMapped = (waterRaw / 4095.0) * 500.0;

  Serial.println("--- Reading Zone 3 ---");
  Serial.print("Fire: "); Serial.println(fireMapped);
  Serial.print("Gas: "); Serial.println(gasMapped);
  Serial.print("Water: "); Serial.println(waterMapped);
  Serial.print("PIR: "); Serial.println(pirState ? "YES" : "NO");

  if(WiFi.status()== WL_CONNECTED){
    HTTPClient http;
    
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Zone-API-Key", "key_data_789"); // Required by backend
    http.addHeader("bypass-tunnel-reminder", "true"); // Required by localtunnel

    // Must match BatchReadingPayload exactly
    String jsonPayload = "{\"readings\":[{";
    jsonPayload += "\"sequence_number\":" + String(millis()) + ",";
    jsonPayload += "\"boot_id\":\"" + bootId + "\",";
    jsonPayload += "\"ms_since_boot\":" + String(millis()) + ",";
    jsonPayload += "\"is_late\":false,";
    jsonPayload += "\"fire_raw\":" + String(fireMapped) + ",";
    jsonPayload += "\"gas_raw\":" + String(gasMapped) + ",";
    jsonPayload += "\"water_raw\":" + String(waterMapped) + ",";
    jsonPayload += "\"pir_raw\":" + String(pirState ? "true" : "false") + ",";
    jsonPayload += "\"warmup\":" + String(is_warmup ? "true" : "false");
    jsonPayload += "}]}";

    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }

  // Send data every 1 second
  delay(1000);
}
