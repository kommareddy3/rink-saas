from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error

import os

app = FastAPI()

model = None

# ✅ Input schema
class InputData(BaseModel):
    values: list[float]
    steps: int = 5   # ✅ default value added

# ✅ TRAIN MODEL
@app.post("/train")
def train():
    global model

    df = pd.read_csv("uploaded.csv")
    df = df[['pmms30']].dropna()

    df['lag1'] = df['pmms30'].shift(1)
    df = df.dropna()

    X = df[['lag1']]
    y = df['pmms30']

    model = LinearRegression()
    model.fit(X, y)

    preds = model.predict(X)

    rmse = np.sqrt(mean_squared_error(y, preds))
    mae = mean_absolute_error(y, preds)

    return {
        "status": "trained",
        "rmse": float(rmse),
        "mae": float(mae)
    }

# ✅ PREDICT
@app.post("/predict")
def predict(data: InputData):
    global model

    if model is None:
        return {"error": "Model not trained yet"}

    current = data.values[-1]
    predictions = []

    for _ in range(data.steps):
        pred = model.predict([[current]])[0]
        predictions.append(float(pred))
        current = pred  # feed prediction back

    return {"predictions": predictions}

# ✅ DATA FOR CHART
@app.get("/data")
def get_data():
    file_path = "uploaded.csv"

    if not os.path.exists(file_path):
        return {"data": [7.1, 7.2, 7.3, 7.4, 7.5]}

    df = pd.read_csv(file_path)

    if "pmms30" not in df.columns:
        return {"data": [7.1, 7.2, 7.3]}

    df = df[['pmms30']].dropna().tail(20)

    return {"data": df['pmms30'].tolist()}