"use client";

import { useState, useEffect } from 'react';
import { Button, Slider, Typography, Box, Paper, Alert } from '@mui/material';

export default function ServoControl() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [writer, setWriter] = useState<WritableStreamDefaultWriter | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [servoPosition, setServoPosition] = useState<number>(90);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Connect to Arduino
  async function connectToArduino() {
    if (!navigator.serial) {
      setError("Web Serial API not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setLoading(true);
    try {
      // Request port access
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });

      // Get a writer to send commands
      const writer = selectedPort.writable.getWriter();

      // Store connection info in state
      setPort(selectedPort);
      setWriter(writer);
      setIsConnected(true);
      setError(null);
    } catch (error) {
      console.error("Error connecting to Arduino:", error);
      setError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  // Disconnect from Arduino
  async function disconnectFromArduino() {
    setLoading(true);
    try {
      // First release the writer
      if (writer) {
        writer.releaseLock();
      }

      // Then close the port
      if (port) {
        await port.close();
      }

      // Reset state
      setPort(null);
      setWriter(null);
      setIsConnected(false);
      setError(null);
    } catch (error) {
      console.error("Error disconnecting:", error);
      setError(`Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  // Reset connection if it gets stuck
  function resetConnection() {
    if (writer) {
      try {
        writer.releaseLock();
      } catch (e) {
        console.warn("Error releasing writer:", e);
      }
    }

    setPort(null);
    setWriter(null);
    setIsConnected(false);
    setError(null);
    console.log("Connection reset");
  }

  // Send position command to Arduino
  async function sendPosition(position: number) {
    if (!writer || !isConnected) return;

    try {
      // Update state
      setServoPosition(position);

      // Create the command string
      const command = `S${position}\n`;

      // Convert to bytes and send
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(command));

      console.log(`Sent position: ${position}`);
    } catch (error) {
      console.error("Error sending command:", error);
      setError(`Failed to send command: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isConnected && writer && port) {
        writer.releaseLock();
        port.close().catch(e => console.warn("Error closing port on unmount:", e));
      }
    };
  }, [isConnected, writer, port]);

  // Handle slider change
  function handleSliderChange(event: Event, newValue: number | number[]) {
    const position = newValue as number;
    sendPosition(position);
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Arduino Servo Control</h1>

      {error && (
        <Alert
          severity="error"
          className="mb-4"
          action={
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Paper className="p-4 mb-6">
        <Box className="flex flex-col items-center">
          <Typography variant="h6" className="mb-2">Connection</Typography>

          <Box className="flex gap-2 mb-2">
            {!isConnected ? (
              <Button
                variant="contained"
                color="primary"
                onClick={connectToArduino}
                disabled={loading}
              >
                Connect to Arduino
              </Button>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                onClick={disconnectFromArduino}
                disabled={loading}
              >
                Disconnect
              </Button>
            )}

            <Button
              variant="outlined"
              color="warning"
              onClick={resetConnection}
              disabled={loading}
            >
              Reset Connection
            </Button>
          </Box>

          <Typography>
            Status: {isConnected ? "Connected" : "Disconnected"}
            {loading && " (Working...)"}
          </Typography>
        </Box>
      </Paper>

      <Paper className="p-4">
        <Box className="flex flex-col items-center">
          <Typography variant="h6" className="mb-4">Servo Control</Typography>

          <Box className="w-full max-w-md px-4 mb-4">
            <Slider
              value={servoPosition}
              min={0}
              max={180}
              step={1}
              onChange={handleSliderChange}
              disabled={!isConnected || loading}
              valueLabelDisplay="on"
              aria-label="Servo position"
            />
          </Box>

          <Box className="flex flex-wrap gap-2 justify-center">
            {[0, 45, 90, 135, 180].map((pos) => (
              <Button
                key={pos}
                variant="outlined"
                onClick={() => sendPosition(pos)}
                disabled={!isConnected || loading}
              >
                {pos}°
              </Button>
            ))}
          </Box>

          <Typography className="mt-4">
            Current position: {servoPosition}°
          </Typography>
        </Box>
      </Paper>

      <Box className="mt-6">
        <Typography variant="subtitle2" className="text-gray-600">
          Note: Make sure your Arduino has the following code uploaded:
        </Typography>
        <pre className="bg-gray-100 p-2 mt-1 text-xs overflow-auto">
{`#include <Servo.h>
Servo myservo;
String inputString = "";
boolean stringComplete = false;

void setup() {
  Serial.begin(9600);
  inputString.reserve(200);
  myservo.attach(9);  // Servo on pin 9
  myservo.write(90);  // Initial position
}

void loop() {
  if (stringComplete) {
    if (inputString.startsWith("S")) {
      int pos = inputString.substring(1).toInt();
      pos = constrain(pos, 0, 180);
      myservo.write(pos);
      Serial.print("Position: ");
      Serial.println(pos);
    }
    inputString = "";
    stringComplete = false;
  }
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar != '\\n') {
      inputString += inChar;
    } else {
      stringComplete = true;
    }
  }
}`}
        </pre>
      </Box>
    </div>
  );
}
