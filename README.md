# 🚀 RINK (Research Innovation & Next-gen Knowledge)

## 🧠 AI SaaS Platform for Time-Series Forecasting & Data Intelligence

RINK is a full-stack AI-powered SaaS platform that enables users to upload datasets, train machine learning models, and generate real-time predictions with interactive visualizations. It is designed to bridge the gap between data, machine learning, and scalable web applications.

---

## 🌟 Key Features

* 📤 **Dataset Upload**

  * Upload CSV datasets directly from the UI
  * Automatic backend processing

* ⚙️ **Automated Model Training**

  * Train ML models on uploaded data
  * Feature engineering (lag-based time-series modeling)

* 🔮 **Multi-Step Forecasting**

  * Predict future values using recursive forecasting
  * Supports configurable prediction steps

* 📊 **Interactive Dashboard**

  * Visualize historical data and predictions
  * Built using Recharts

* 📈 **Model Evaluation**

  * RMSE (Root Mean Squared Error)
  * MAE (Mean Absolute Error)

* 🧩 **Microservices Architecture**

  * React frontend
  * Node.js API gateway
  * FastAPI ML service

---

## 🏗️ Architecture

```text
React (Frontend)
   ↓
Node.js (Backend API Layer)
   ↓
FastAPI (Machine Learning Service)
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Recharts

### Backend

* Node.js
* Express.js
* Multer (file upload)

### Machine Learning

* FastAPI
* Scikit-learn
* Pandas
* NumPy

---

## 📁 Project Structure

```
rink-saas/
│
├── client/        # React frontend
├── server/        # Node.js backend
├── ml_api/        # FastAPI ML service
├── uploaded.csv   # Uploaded dataset
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone Repository

```
git clone https://github.com/your-username/rink-saas.git
cd rink-saas
```

---

### 2️⃣ Run ML Service (FastAPI)

```
cd ml_api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

👉 Access API Docs: http://localhost:8000/docs

---

### 3️⃣ Run Backend (Node.js)

```
cd server
npm install
node server.js
```

---

### 4️⃣ Run Frontend (React)

```
cd client
npm install
npm run dev
```

👉 App runs at: http://localhost:5173

---

## 🧪 How to Use

1. Go to **Upload Page**
2. Upload your CSV dataset
3. Model automatically trains
4. Navigate to **Dashboard**
5. View:

   * Historical data (Actual)
   * Predicted future values
6. Use **ML page** for manual predictions

---

## 📊 Example Prediction Flow

```
Input:  [7.1, 7.2, 7.3, 7.4, 7.5]
Output: [7.3, 7.35, 7.4, 7.45, 7.5]
```

---

## 🚀 Future Enhancements

* 🔐 Authentication (JWT-based login)
* ☁️ Cloud deployment (AWS / Vercel / Render)
* 📊 Advanced models (XGBoost, LSTM)
* 📁 Dataset preview & validation
* 💳 Subscription-based SaaS model

---

## 👨‍💻 Author

**RINK Development Team**
Focused on AI, Machine Learning, and Next-gen SaaS systems

---

## 📄 License

MIT License

---
