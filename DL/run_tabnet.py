import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import os
os.chdir("dl")  # notebooks expect to run from dl/

# Install TabNet if not already installed
# !pip install pytorch-tabnet

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score, classification_report, ConfusionMatrixDisplay, RocCurveDisplay

from pytorch_tabnet.tab_model import TabNetClassifier
import torch

np.random.seed(42)
torch.manual_seed(42)

df = pd.read_csv('bihar_flood_data.csv')

df['Date'] = pd.to_datetime(df['Date'])
df['year']       = df['Date'].dt.year
df['month']      = df['Date'].dt.month
df['day']        = df['Date'].dt.day
df['is_monsoon'] = df['month'].apply(lambda x: 1 if x in [6,7,8,9] else 0)
df.drop(columns=['Date'], inplace=True)
df = pd.get_dummies(df, columns=['District'], drop_first=True)

X = df.drop(columns=['Flood']).values.astype(np.float32)
y = df['Flood'].values

scaler = StandardScaler()
X = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# TabNet needs validation set separately
X_train_tab, X_val_tab, y_train_tab, y_val_tab = train_test_split(
    X_train, y_train, test_size=0.2, random_state=42, stratify=y_train
)

print('Train:', X_train_tab.shape, '| Val:', X_val_tab.shape, '| Test:', X_test.shape)

# Compute class weights for imbalance
from sklearn.utils.class_weight import compute_class_weight
classes = np.unique(y_train_tab)
weights = compute_class_weight('balanced', classes=classes, y=y_train_tab)
class_weight = dict(zip(classes, weights))
print('Class weights:', class_weight)

model = TabNetClassifier(
    n_d=32,              # Width of decision step output
    n_a=32,              # Width of attention step output
    n_steps=5,           # Number of sequential attention steps
    gamma=1.3,           # Coefficient for feature reusage
    n_independent=2,
    n_shared=2,
    momentum=0.02,
    epsilon=1e-15,
    seed=42,
    optimizer_fn=torch.optim.Adam,
    optimizer_params=dict(lr=2e-2),
    scheduler_params={'step_size': 50, 'gamma': 0.9},
    scheduler_fn=torch.optim.lr_scheduler.StepLR,
    verbose=10
)

model.fit(
    X_train=X_train_tab, y_train=y_train_tab,
    eval_set=[(X_val_tab, y_val_tab)],
    eval_name=['val'],
    eval_metric=['auc', 'accuracy'],
    max_epochs=200,
    patience=20,           # Early stopping patience
    batch_size=256,
    virtual_batch_size=128,
    weights=1,             # 1 = use class weights automatically
    drop_last=False
)

plt.figure(figsize=(10, 4))
plt.plot(model.history['val_auc'], label='Val AUC')
plt.plot(model.history['val_accuracy'], label='Val Accuracy')
plt.title('TabNet Training History')
plt.xlabel('Epoch')
plt.legend()
plt.tight_layout()
plt.savefig("plot_tabnet.png"); plt.close()

y_pred = model.predict(X_test)
y_pred_prob = model.predict_proba(X_test)[:, 1]

acc = accuracy_score(y_test, y_pred)
f1  = f1_score(y_test, y_pred)

print(f'Accuracy : {acc:.4f}')
print(f'F1 Score : {f1:.4f}')
print()
print(classification_report(y_test, y_pred, target_names=['No Flood','Flood']))

import json
with open('dl_tabnet_results.json', 'w') as fp:
    json.dump({'model': 'TabNet', 'accuracy': round(acc,4), 'f1': round(f1,4)}, fp)
print('Results saved to dl_tabnet_results.json')

# TabNet provides built-in feature importance via attention masks
feature_names = df.drop(columns=['Flood']).columns.tolist()
importances = model.feature_importances_

feat_df = pd.DataFrame({'Feature': feature_names, 'Importance': importances})
feat_df = feat_df.sort_values('Importance', ascending=True).tail(15)

plt.figure(figsize=(10, 6))
plt.barh(feat_df['Feature'], feat_df['Importance'], color='steelblue')
plt.title('TabNet Feature Importance (Attention-based) — Top 15')
plt.xlabel('Importance')
plt.tight_layout()
plt.savefig("plot_tabnet.png"); plt.close()

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
ConfusionMatrixDisplay.from_predictions(y_test, y_pred, display_labels=['No Flood','Flood'],
                                         cmap='Blues', ax=axes[0])
axes[0].set_title('Confusion Matrix — TabNet')
RocCurveDisplay.from_predictions(y_test, y_pred_prob, ax=axes[1])
axes[1].set_title('ROC Curve — TabNet')
plt.tight_layout()
plt.savefig("plot_tabnet.png"); plt.close()

