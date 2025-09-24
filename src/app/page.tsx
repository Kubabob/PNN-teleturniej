'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

// Updated Web Serial API type declarations
declare global {
  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }

  interface Navigator {
    serial: {
      requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>;
      getPorts: () => Promise<SerialPort[]>;
    }
  }

  interface SerialPort {
    open: (options: SerialOptions) => Promise<void>;
    close: () => Promise<void>;
    writable: WritableStream;
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: string;
    bufferSize?: number;
    flowControl?: string;
  }
}

// Sample questions data - replace with your actual data
const questionsData = [
  { id: 1, question: "Jaki jest największy ssak lądowy?", correctAnswer: "" },
  { id: 2, question: "Jakie kolory są we fladze Polski?", correctAnswer: "" },
  { id: 3, question: "Ile kątów ma trójkąt?", correctAnswer: "3" },
  { id: 4, question: "Ile godzin trwa dzień?", correctAnswer: "24" },
  { id: 5, question: "Co jest przeciwieństwem nocy?", correctAnswer: "dzień" },
  { id: 6, question: 'Dlaczego Ziemia jest "niebieską planetą"?', correctAnswer: "" },
  { id: 7, question: "Ile palców ma standardowy człowiek?", correctAnswer: "20" },
  { id: 8, question: 'Po co nam nos?', correctAnswer: 'Aby móc oddychać.'},
  { id: 9, question: 'Jakiego koloru jest mleko?', correctAnswer: 'Zazwyczaj białego'},
  { id: 10, question: 'Jakiego koloru jest śnieg?', correctAnswer: 'Zazwyczaj białego'},
  { id: 11, question: 'Ile mamy znaków zodiaku?', correctAnswer: '12'},
  { id: 12, question: 'Z czego pada deszcz?', correctAnswer: 'Z chmur'},
  { id: 13, question: 'Jakiego koloru zazwyczaj są chipsy?', correctAnswer: 'Żółty/pomarańczowy'},
  { id: 14, question: 'Co jest przeciwieństwem dnia?', correctAnswer: 'Noc'},
  { id: 15, question: 'Ile kątów ma kwadrat?', correctAnswer: '4'},
  { id: 16, question: 'Ile mamy planet w Układzie Słonecznym?', correctAnswer: '8'},
  { id: 17, question: 'Jaki kształt ma pizza?', correctAnswer: 'Okrągły'},
  { id: 18, question: 'Co jest czarno-białe i daje mleko?', correctAnswer: 'Krowa'},
  { id: 19, question: 'Jakie zwierzę robi "miau"?', correctAnswer: 'Kot'},
  { id: 20, question: 'Ile to tuzin?', correctAnswer: '12'},
  { id: 21, question: 'Jaki kolor ma trawa?', correctAnswer: 'Zielony'},
  { id: 22, question: 'Co jest zawsze na powierzchni morza/oceanu?', correctAnswer: 'Fale'},
  { id: 23, question: 'Jakie są 4 kierunki świata?', correctAnswer: 'Północ, południe, wschód, zachód'},
  { id: 24, question: 'Ile samochód ma kół', correctAnswer: '4/5'},
  { id: 25, question: "Jakiego koloru jest niebo?", correctAnswer: "" },
  { id: 26, question: 'Więcej niż jedno zwierzę to?', correctAnswer: 'Lamy'},
];

export default function Home() {
  const [apiOutput, setApiOutput] = useState<string>("");
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined');

  const upPosition = 90;
  const downPosition = 0;

  // Servo control states
  const [port, setPort] = useState<SerialPort | null>(null);
  const [writer, setWriter] = useState<WritableStreamDefaultWriter | null>(null);
  const [isServoConnected, setIsServoConnected] = useState(false);
  const [servoPosition, setServoPosition] = useState(upPosition);
  const [servoError, setServoError] = useState<string | null>(null);

  // Get the selected question object
  const currentQuestion = selectedQuestion
    ? questionsData.find(q => q.id === selectedQuestion)
    : null;

  // Servo control functions
  async function connectToArduino() {
    if (!navigator.serial) {
      setServoError("Web Serial API not supported in this browser. Try Chrome or Edge.");
      return;
    }

    try {
      // Request port access
      const selectedPort = await navigator.serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });

      const outputStream = selectedPort.writable;
      const writer = outputStream.getWriter();

      setPort(selectedPort);
      setWriter(writer);
      setIsServoConnected(true);
      setServoError(null);

      console.log("Connected to Arduino!");

      // Initialize servo to 0 degrees
      sendServoPosition(upPosition);
    } catch (error) {
      console.error("Error connecting to Arduino:", error);
      setServoError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function disconnectFromArduino() {
    try {
      // First release the writer
      if (writer) {
        try {
          // Reset servo to 90 before disconnecting
          const encoder = new TextEncoder();
          await writer.write(encoder.encode(`S${upPosition}\n`));
        } catch (e) {
          console.warn("Could not send final position command", e);
        }

        writer.releaseLock();
      }

      // Then close the port
      if (port) {
        await port.close();
      }

      setPort(null);
      setWriter(null);
      setIsServoConnected(false);
      setServoError(null);
      console.log("Disconnected from Arduino");
    } catch (error) {
      console.error("Error during disconnection:", error);
      setServoError("Failed to disconnect properly. You may need to refresh the page.");
    }
  }

  const sendServoPosition = useCallback(async (position: number) => {
    if (!writer || !isServoConnected) return;

    // Convert position to a string command ending with newline
    const command = `S${position}\n`;

    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(command);

    try {
      await writer.write(data);
      setServoPosition(position);
      console.log(`Sent position: ${position}`);
    } catch (error) {
      console.error("Error sending command:", error);
      setServoError(`Failed to send command: ${error instanceof Error ? error.message : String(error)}`);
      setIsServoConnected(false);
    }
  }, [writer, isServoConnected]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (isServoConnected && writer && port) {
        try {
          writer.releaseLock();
          port.close().catch(e => console.warn("Error closing port on unmount:", e));
        } catch (e) {
          console.warn("Error during cleanup:", e);
        }
      }
    };
  }, [isServoConnected, writer, port]);

  // Move servo to 90 when question changes
  useEffect(() => {
    if (selectedQuestion && isServoConnected) {
      sendServoPosition(upPosition);
    }
  }, [selectedQuestion, isServoConnected, sendServoPosition]);

  // Move servo to 0 when API response is received
  useEffect(() => {
    if (apiOutput && !isLoading && isServoConnected) {
      sendServoPosition(downPosition);
    }
  }, [apiOutput, isLoading, isServoConnected, sendServoPosition]);

  const randomQuestion = () => {
    const idx = Math.floor(Math.random() * questionsData.length);
    const q = questionsData[idx];
    setSelectedQuestion(q?.id ?? null);
    setApiOutput('');

    // Reset servo when question changes
    if (isServoConnected) {
      sendServoPosition(upPosition);
    }
  };

  const handleSendRequest = async (questionText?: string) => {
    if (!questionText && !currentQuestion) return;

    const questionToSend = questionText || currentQuestion?.question;

    setIsLoading(true);
    try {
      // Replace with your actual API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Bierzesz udział w teleturnieju. Dostaniesz pytanie na które musisz szybko odpowiedzieć." },
            { role: "user", content: questionToSend }
          ],
        }),
      });

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "Brak odpowiedzi od API";
      setApiOutput(responseText);

      // Move servo to 0 degrees when we get a response
      if (isServoConnected) {
        sendServoPosition(downPosition);
      }
    } catch (error) {
      setApiOutput(`Error: ${error instanceof Error ? error.message : 'Nieznany Error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customQuestion.trim()) {
      handleSendRequest(customQuestion);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.servoControl}>
        <h3>Kontrola Serwomechanizmu</h3>
        {servoError && <p className={styles.error}>{servoError}</p>}

        <div className={styles.servoButtons}>
          {!isServoConnected ? (
            <button
              onClick={connectToArduino}
              className={styles.servoButton}
            >
              Połącz z Arduino
            </button>
          ) : (
            <>
              <button
                onClick={disconnectFromArduino}
                className={styles.servoButton}
              >
                Rozłącz Arduino
              </button>
              <button
                onClick={() => sendServoPosition(upPosition)}
                className={styles.servoButton}
              >
                {`Reset Servo (${upPosition})`}
              </button>
            </>
          )}
        </div>

        <p className={styles.servoStatus}>
          Status: {isServoConnected ? `Połączono (Pozycja: ${servoPosition}°)` : 'Rozłączono'}
        </p>
      </div>

      <div className={styles.outputSection}>
        {isLoading ? (
          <p>Ładowanie...</p>
        ) : (
          <div className={styles.apiOutput}>
            {apiOutput || "Odpowiedź API pojawi się tutaj"}
          </div>
        )}
      </div>

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'predefined' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('predefined')}
        >
          Gotowe pytania
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'custom' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          Własne pytanie
        </button>
      </div>

      {activeTab === 'predefined' ? (
        <div className={styles.controlSection}>
          <div className={styles.selectContainer}>
            <button
              onClick={randomQuestion}
              disabled={isLoading}
              className={styles.sendButton}
            >
              Losuj pytanie
            </button>
            <select
              value={selectedQuestion || ''}
              onChange={(e) => {
                setSelectedQuestion(Number(e.target.value) || null);
                setApiOutput('');
              }}
              className={styles.questionSelect}
            >
              <option value="">Wybierz pytanie</option>
              {questionsData.map(q => (
                <option key={q.id} value={q.id}>
                  {q.id}: {q.question}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleSendRequest()}
            disabled={!selectedQuestion || isLoading}
            className={styles.sendButton}
          >
            Wyślij zapytanie
          </button>
        </div>
      ) : (
        <form onSubmit={handleCustomQuestionSubmit} className={styles.customQuestionForm}>
          <textarea
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Wpisz swoje pytanie tutaj..."
            className={styles.customQuestionInput}
            rows={4}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!customQuestion.trim() || isLoading}
            className={styles.sendButton}
          >
            Wyślij własne pytanie
          </button>
        </form>
      )}

      {currentQuestion && activeTab === 'predefined' && (
        <details className={styles.answerSection}>
          <summary>Poprawna odpowiedź:</summary>
          <p>{currentQuestion.correctAnswer}</p>
        </details>
      )}
    </div>
  );
}
