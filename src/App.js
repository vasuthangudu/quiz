// Keep the imports as is...
import React, { useEffect, useState, useRef } from "react";
import quizFile from "./quizData.json";
import "bootstrap/dist/css/bootstrap.min.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helpers
const parseTime = (hhmmss = "00:10:00") =>
  hhmmss.split(":").map(Number).reduce((s, n) => s * 60 + n);
const formatTime = (s) =>
  [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

export default function App() {
  const totalSeconds = parseTime(quizFile.settings.totalTime);
  const [formVisible, setFormVisible] = useState(true);
  const [userData, setUserData] = useState({ fullName: "", phoneNumber: "" });
  const [started, setStarted] = useState(false);
  const [catSel, setCatSel] = useState({ Easy: true, Medium: true, Hard: true });
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!started) return;
    const cats = Object.entries(catSel).filter(([, v]) => v).map(([c]) => c);
    const qs = shuffle(quizFile.questions.filter((q) => cats.includes(q.category)));
    setQuestions(qs);
    setCurrentIndex(0);
    setSelected({});
    setSubmitted(false);
    setSecondsLeft(totalSeconds);
  }, [started, catSel, totalSeconds]);

  useEffect(() => {
    if (!started || submitted || questions.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSecondsLeft((sec) => {
        if (sec <= 1) {
          clearInterval(timerRef.current);
          setSubmitted(true);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [started, submitted, questions, currentIndex]);

  // ✅ Updated retry logic (no page reload)
  const handleRetry = () => {
    setStarted(false);
    setSubmitted(false);
    setFormVisible(true);
    setUserData({ fullName: "", phoneNumber: "" });
    setCatSel({ Easy: true, Medium: true, Hard: true });
    setQuestions([]);
    setSelected({});
    setCurrentIndex(0);
    setSecondsLeft(totalSeconds);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Quiz Results : ${score} / ${questions.length}`, 14, 10);
    doc.text(`Name: ${userData.fullName}`, 14, 18);
    doc.text(`Phone: ${userData.phoneNumber}`, 14, 26);

    const rows = questions.map((q, i) => [
      `Q${i + 1}`,
      q.category,
      q.question,
      selected[q.id] ?? "No Answer",
      q.answer,
      selected[q.id] === q.answer ? "✔" : "✘",
    ]);

    autoTable(doc, {
      head: [["No", "Cat", "Question", "Your", "Correct", "Result"]],
      body: rows,
      startY: 32,
      styles: { fontSize: 8 },
    });

    doc.save("results.pdf");
  };

  const score = questions.reduce((c, q) => c + (selected[q.id] === q.answer), 0);
  const btnClass = (i) => {
    const q = questions[i];
    const ans = selected[q.id];
    if (submitted) return ans == null ? "btn-outline-dark" : ans === q.answer ? "btn-success" : "btn-danger";
    if (i === currentIndex) return "btn-primary";
    return ans ? "btn-warning" : "btn-outline-secondary";
  };

  if (formVisible) {
    return (
      <div className="container py-5" style={{ maxWidth: 500 }}>
        <h3 className="mb-4 text-center">Enter Your Details</h3>
        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-control"
            value={userData.fullName}
            onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Phone Number</label>
          <input
            type="tel"
            className="form-control"
            value={userData.phoneNumber}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d{0,10}$/.test(val)) {
                setUserData({ ...userData, phoneNumber: val });
              }
            }}
            maxLength={10}
            placeholder="Enter 10-digit phone number"
          />
        </div>
        <button
          className="btn btn-primary w-100"
          onClick={() => {
            if (userData.phoneNumber.length !== 10) {
              alert("Phone number must be exactly 10 digits.");
              return;
            }
            setFormVisible(false);
          }}
          disabled={!userData.fullName || !userData.phoneNumber}
        >
          Next ➡
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="container py-5" style={{ maxWidth: 400 }}>
        <h3 className="mb-4 text-center">Select Categories</h3>
        {Object.keys(catSel).map((c) => (
          <div key={c} className="form-check mb-2">
            <input
              id={c}
              type="checkbox"
              className="form-check-input"
              checked={catSel[c]}
              onChange={() => setCatSel((p) => ({ ...p, [c]: !p[c] }))}
            />
            <label htmlFor={c} className="form-check-label">{c}</label>
          </div>
        ))}
        <button
          className="btn btn-primary w-100 mt-3"
          disabled={Object.values(catSel).every((v) => !v)}
          onClick={() => setStarted(true)}
        >
          Start Quiz
        </button>
      </div>
    );
  }

  const cur = questions[currentIndex];
  if (!cur) return <p className="text-center mt-4">Loading...</p>;

  return (
    <div className="container-fluid py-3">
      <div className="row">
        <div className="col-md-3 border-end mb-3 mb-md-0">
          <h5 className="text-center">Questions</h5>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            {questions.map((_, i) => (
              <button key={i} className={`btn btn-sm ${btnClass(i)}`} onClick={() => setCurrentIndex(i)}>
                Q{i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="col-md-9">
          <div className="mb-2">
            <strong>Name:</strong> {userData.fullName} | <strong>Phone:</strong> {userData.phoneNumber}
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>
              Question {currentIndex + 1}/{questions.length} <small className="text-muted">[{cur.category}]</small>
            </h5>
            <h5>Time Left: <span className="text-danger">{formatTime(secondsLeft)}</span></h5>
          </div>

          {!submitted ? (
            <>
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <h5>{cur.question}</h5>
                  {cur.options.map((opt) => (
                    <label key={opt} className="list-group-item">
                      <input
                        type="radio"
                        className="form-check-input me-2"
                        name={cur.id}
                        value={opt}
                        checked={selected[cur.id] === opt}
                        onChange={() => setSelected((p) => ({ ...p, [cur.id]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div className="d-flex justify-content-between">
                <button
                  className="btn btn-secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => i - 1)}
                >
                  ⬅ Prev
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button className="btn btn-primary" onClick={() => setCurrentIndex((i) => i + 1)}>Next ➡</button>
                ) : (
                  <button className="btn btn-success" onClick={() => setSubmitted(true)}>Submit ✅</button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="alert alert-info text-center fw-bold">
                🎯 Score: {score} / {questions.length}
              </div>
              {questions.map((q, i) => {
                const a = selected[q.id];
                const ok = a === q.answer;
                return (
                  <div key={q.id} className="card mb-2 shadow-sm">
                    <div className="card-body">
                      <h6><strong>Q{i + 1}</strong> [{q.category}] – {q.question}</h6>
                      <p><strong>Your Answer:</strong> {a || "No Answer"}</p>
                      {!ok && <p><strong>Correct Answer:</strong> {q.answer}</p>}
                      <span className={`badge ${ok ? "bg-success" : "bg-danger"}`}>{ok ? "Correct" : "Incorrect"}</span>
                    </div>
                  </div>
                );
              })}
              <div className="text-center mt-3">
                <button className="btn btn-warning me-3" onClick={handleRetry}>🔁 Retry</button>
                <button className="btn btn-outline-dark" onClick={exportPDF}>📄 Export PDF</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
