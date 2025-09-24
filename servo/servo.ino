#include <Servo.h>

Servo myservo;
String inputString = "";
boolean stringComplete = false;

void setup() {
  // Start serial connection
  Serial.begin(9600);

  // Reserve space for the inputString
  inputString.reserve(200);

  // Connect servo to pin 9
  myservo.attach(9);

  // Move to center position on startup
  myservo.write(90);

  // Indicate we're ready
  Serial.println("Servo Control Ready");
}

void loop() {
  // Check if a complete command was received
  if (stringComplete) {
    // Process the command
    if (inputString.startsWith("S")) {
      // Extract the position number
      int pos = inputString.substring(1).toInt();

      // Constrain to valid servo range
      pos = constrain(pos, 0, 180);

      // Move servo to position
      myservo.write(pos);

      // Send feedback
      Serial.print("Moved to position: ");
      Serial.println(pos);
    }

    // Clear the string for the next command
    inputString = "";
    stringComplete = false;
  }
}

// This function is called when new serial data arrives
void serialEvent() {
  while (Serial.available()) {
    // Get the new byte
    char inChar = (char)Serial.read();

    // Add it to the inputString if it's not a newline
    if (inChar != '\n') {
      inputString += inChar;
    }
    // If the incoming character is a newline, set a flag
    else {
      stringComplete = true;
    }
  }
}
