from ultralytics import YOLO
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
def load_model(model_path, device):
  """ Loads the YOLO model.

  Args:
      model_path (str): Path to model
      device (str): Device your want to use
  """
  try:
    yolo_model = YOLO(model_path, task='detect')
    logging.error(f'Model da duoc tai tu {model_path}')
    return yolo_model
  except Exception as e: 
    logging.error(f"Error loading YOLO model: {e}")
    return None