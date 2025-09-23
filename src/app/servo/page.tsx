"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button, Slider, Typography, Box, Paper, Alert } from '@mui/material';

// Add Web Serial API type declarations
declare global {
  interface Navigator {
    serial: {
      requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>;
      getPorts: () => Promise<SerialPort[]>;
    };
  }
}

export default function ServoControl() {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [writer, setWriter] = useState<WritableStreamDefaultWriter | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [servoPosition, setServoPosition] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Improved disconnect function
  async function disconnectFromArduino() {
    setIsProcessing(true);
    setError(null);

    try {
      // First release the writer
      if (writer) {
        // Send a reset command to the servo to put it in a safe position
        try {
          const encoder = new TextEncoder();
          await writer.write(encoder.encode("S90\n")); // Move to center position
        } catch (e) {
          console.warn("Could not send final position command", e);
        }

        writer.releaseLock();
        setWriter(null);
      }

      // Then close the port
      if (port) {
        await port.close().catch(e => {
          console.error("Error closing port:", e);
          throw e;
        });
      }

      setPort(null);
      setIsConnected(false);
      console.log("Disconnected from Arduino");
    } catch (error) {
      console.error("Error during disconnection:", error);
      setError("Failed to disconnect properly. You may need to refresh the page.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Reset connection if it gets stuck
  const resetConnection = useCallback(() => {
    setWriter(null);
    setPort(null);
    setIsConnected(false);
    setError(null);
    console.log("Connection reset");
  }, []);

  // Improved connect function
  async function connectToArduino() {
    if (!navigator.serial) {
      setError("Web Serial API not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Request port access
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });

      const outputStream = selectedPort.writable;
      const writer = outputStream.getWriter();

      setPort(selectedPort);
      setWriter(writer);
      setIsConnected(true);

      console.log("Connected to Arduino!");
    } catch (error) {
      console.error("Error connecting to Arduino:", error);
      setError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
      setIsConnected(false);
    } finally {
      setIsProcessing(false);
    }
  }

  // Debounced servo position sending with rate limiting
  const [lastCommandTime, setLastCommandTime] = useState(0);
  const COMMAND_DELAY_MS = 50; // Minimum time between commands

  async function sendServoPosition(position: number) {
    if (!writer || !isConnected) return;

    const now = Date.now();
    if (now - lastCommandTime < COMMAND_DELAY_MS) {
      // Too soon after last command, schedule it
      setTimeout(() => {
        sendServoPosition(position);
      }, COMMAND_DELAY_MS - (now - lastCommandTime));
      return;
    }

    setLastCommandTime(now);
    setIsProcessing(true);

    // Convert position to a string command ending with newline
    const command = `S${position}\n`;

    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(command);

    try {
      await writer.write(data);
      console.log(`Sent position: ${position}`);
    } catch (error) {
      console.error("Error sending command:", error);
      setError(`Failed to send command: ${error instanceof Error ? error.message : String(error)}`);
      // If we can't send commands, we're probably disconnected
      setIsConnected(false);
    } finally {
      setIsProcessing(false);
    }
  }

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isConnected && writer && port) {
        // Try to clean up on unmount
        try {
          writer.releaseLock();
          port.close().catch(e => console.warn("Error closing port on unmount:", e));
        } catch (e) {
          console.warn("Error during cleanup:", e);
        }
      }
    };
  }, [isConnected, writer, port]);

  // Debounced slider change handler
//   const handleSliderChange = useCallback((_event: Event, newValue: number | number[]) => {
//     const position = newValue as number;
//     setServoPosition(position);
//     sendServoPosition(position);
//   }, []);

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
                disabled={isProcessing}
              >
                Connect to Arduino
              </Button>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                onClick={disconnectFromArduino}
                disabled={isProcessing}
              >
                Disconnect
              </Button>
            )}

            <Button
              variant="outlined"
              color="warning"
              onClick={resetConnection}
              disabled={isProcessing}
            >
              Reset Connection
            </Button>
          </Box>

          <Typography>
            Status: {isConnected ? "Connected" : "Disconnected"}
            {isProcessing && " (Processing...)"}
          </Typography>
        </Box>
      </Paper>

      <Paper className="p-4">
        <Box className="flex flex-col items-center">
          <Typography variant="h6" className="mb-4">Servo Control</Typography>

          {/* <Box className="w-full max-w-md px-4 mb-2">
            <Slider
              value={servoPosition}
              min={0}
              max={120}
              step={1}
              onChange={handleSliderChange}
              disabled={!isConnected || isProcessing}
              valueLabelDisplay="on"
              aria-labelledby="servo-position-slider"
            />
          </Box> */}

          <Box className="flex gap-4 mt-2">
            {[0, 30, 60, 90, 120].map(pos => (
              <Button
                key={pos}
                variant="outlined"
                onClick={() => {
                  setServoPosition(pos);
                  sendServoPosition(pos);
                }}
                disabled={!isConnected || isProcessing}
              >
                {pos}°
              </Button>
            ))}
          </Box>

          <Typography className="mt-2">
            Position: {servoPosition}° (0-120°)
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
