#include <WiFi.h>
#include <HTTPClient.h>

// Wokwi provides a virtual WiFi network
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// UPDATE THIS WITH YOUR NGROK URL
// Make sure it ends in /api/zones/1/readings
String serverName = "https://YOUR-NGROK-ID.ngrok-free.app/api/zones/1/readings";

// Pin Definitions
const int FIRE_PIN = 34; // Potentiometer 1
const int GAS_PIN = 35;  // Potentiometer 2
const int WATER_PIN = 32; // Potentiometer 3
const int PIR_PIN = 33;   // Push Button

void setup() {
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

  // Map 0-4095 to 0-500 (our backend typical range)
  float fireMapped = (fireRaw / 4095.0) * 500.0;
  float gasMapped = (gasRaw / 4095.0) * 500.0;
  float waterMapped = (waterRaw / 4095.0) * 500.0;

  Serial.println("--- Reading ---");
  Serial.print("Fire: "); Serial.println(fireMapped);
  Serial.print("Gas: "); Serial.println(gasMapped);
  Serial.print("Water: "); Serial.println(waterMapped);
  Serial.print("PIR: "); Serial.println(pirState ? "YES" : "NO");

  if(WiFi.status()== WL_CONNECTED){
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    // Construct JSON Payload
    String jsonPayload = "{";
    jsonPayload += "\"fire_raw\":" + String(fireMapped) + ",";
    jsonPayload += "\"gas_raw\":" + String(gasMapped) + ",";
    jsonPayload += "\"water_raw\":" + String(waterMapped) + ",";
    jsonPayload += "\"pir_raw\":" + String(pirState ? "true" : "false");
    jsonPayload += "}";

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
