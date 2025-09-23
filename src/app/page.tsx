'use client';
import { useState, useEffect } from 'react';
import styles from './page.module.css';

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
];

export default function Home() {
  const [apiOutput, setApiOutput] = useState<string>("");
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined');


  // Get the selected question object
  const currentQuestion = selectedQuestion
    ? questionsData.find(q => q.id === selectedQuestion)
    : null;

  const randomQuestion = () => {
      const idx = Math.floor(Math.random() * questionsData.length);
      const q = questionsData[idx];
      setSelectedQuestion(q?.id ?? null);
      setApiOutput('');
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
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Bierzesz udział w teleturnieju. Dostaniesz pytanie na które musisz szybko odpowiedzieć." },
            { role: "user", content: questionToSend }
          ],
        }),
      });

      const data = await response.json();
      setApiOutput(data.choices?.[0]?.message?.content || "Brak odpowiedzi od API");
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
              onChange={(e) => setSelectedQuestion(Number(e.target.value) || null)}
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
