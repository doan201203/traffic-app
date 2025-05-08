import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
import yaml
from PIL import ImageFont

def load_font(font_path="DejaVuSans.ttf", font_size=20):
  try:
      FONT_SIZE = 20
      FONT_PATH = "DejaVuSans.ttf"
      PIL_FONT = ImageFont.truetype(FONT_PATH, FONT_SIZE)
      logging.info(f"Loaded font: {FONT_PATH}")
  except IOError:
      PIL_FONT = ImageFont.load_default()
      logging.warning(f"Could not load font {FONT_PATH}, using default PIL font.")
  return PIL_FONT

def load_config(path="config.yaml"):
    """Tải cấu hình từ file YAML."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            conf = yaml.safe_load(f)
            logging.info(f"Configuration loaded successfully from {path}")
            return conf
    except FileNotFoundError:
        logging.error(f"Configuration file not found at {path}")
        return None
    except yaml.YAMLError as e:
        logging.error(f"Error parsing YAML configuration file {path}: {e}")
        return None
    except Exception as e:
        logging.error(f"Error loading configuration from {path}: {e}")
        return None

