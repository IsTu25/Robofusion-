# Wokwi ESP32 Hardware Integration

This directory contains the code and circuit layout needed to connect a visual, interactive ESP32 simulation to your local RoboFusion backend using Wokwi.

## Step 1: Create the Wokwi Project
1. Go to [wokwi.com](https://wokwi.com) and create a new **ESP32** project.
2. Open the `sketch.ino` file in this directory and paste its contents into the Wokwi code editor.
3. Open the `diagram.json` file in this directory, click on the **diagram.json** tab in Wokwi, and paste the contents to instantly spawn the ESP32, the potentiometers (knobs), and the push button.

## Step 2: Expose your Local Backend
Because Wokwi runs in the cloud, the ESP32 simulator cannot send requests to `http://localhost:8000`. You need to expose your local port 8000 to the public internet temporarily.

The easiest way is using **ngrok**:
1. Download and install ngrok from [ngrok.com](https://ngrok.com).
2. Run the backend server locally: `cd backend && uvicorn app.main:app` (or use the Docker container on port 8000).
3. In a new terminal, run:
   ```bash
   ngrok http 8000
   ```
4. Ngrok will output a Forwarding URL (e.g., `https://1a2b-3c4d.ngrok-free.app`).

## Step 3: Connect and Play!
1. Go back to your Wokwi `sketch.ino` code.
2. Find the `serverName` variable on line 9.
3. Replace the URL with your ngrok forwarding URL, making sure it ends in `/api/zones/1/readings`.
   - Example: `String serverName = "https://1a2b-3c4d.ngrok-free.app/api/zones/1/readings";`
4. Click the green **Play** button in Wokwi.
5. Watch the Serial Monitor to confirm it connects to `Wokwi-GUEST` WiFi.
6. Open your Next.js dashboard in your browser.
7. Click on the potentiometers in Wokwi and drag the sliders to simulate gas, fire, and water levels. Press the red button to trigger the PIR sensor.
8. Watch the dashboard react instantly in real-time!
