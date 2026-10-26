---
license: mit
language:
- en
- sw
pipeline_tag: image-classification
tags:
- Smart Agriculture
- smartfarming
- vit
- computervision
---

# ONNX Quantized Model: crop_leaf_diseases_vit

This repository contains an ONNX quantized version of the pre-trained ViT model for crop leaf disease classification originally from `wambugu71/crop_leaf_diseases_vit`.

The original model was converted to the ONNX format and then quantized to INT8 for improved efficiency and reduced size, making it suitable for deployment in resource-constrained environments, such as mobile devices.

## Model Details

* **Original Model:** `wambugu71/crop_leaf_diseases_vit`
* **Format:** ONNX (Quantized to INT8)
* **Task:** Image Classification
* **Classes:** (List the classes if available from the original model card or documentation, otherwise mention they are from the original model)

## Usage

This model can be loaded and used for inference with the ONNX Runtime.

```python
import onnxruntime as ort
import numpy as np
from PIL import Image
from transformers import AutoFeatureExtractor # Assuming feature_extractor is needed for preprocessing

# Load the quantized ONNX model
onnx_model_path = "crop_leaf_diseases_vit.quant.onnx" # or the correct quantized model file name
session = ort.InferenceSession(onnx_model_path)

# Get input and output names
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Example inference (assuming you have an image and a feature extractor)
# Replace with your actual image loading and preprocessing
image_path = "path/to/your/image.jpg"
image = Image.open(image_path).convert("RGB")

# Load the feature extractor used during conversion
# feature_extractor = AutoFeatureExtractor.from_pretrained("wambugu71/crop_leaf_diseases_vit")
# inputs = feature_extractor(images=image, return_tensors="np")
# pixel_values = inputs["pixel_values"]

# If not using a feature extractor, you might need to preprocess manually
# based on the original model's requirements (e.g., resize, normalize)
# For example, if the model expects 3x224x224 float32 input:
# resized_image = image.resize((224, 224))
# input_data = np.array(resized_image, dtype=np.float32).transpose(2, 0, 1) # HWC to CHW
# input_data = np.expand_dims(input_data, axis=0) # Add batch dimension
# pixel_values = input_data

# Run inference
outputs = session.run([output_name], {input_name: pixel_values})
logits = outputs[0]

# Post-processing (example for classification)
predicted_class_idx = np.argmax(logits, axis=1)[0]
print("Predicted class index:", predicted_class_idx)

# You would then map the predicted_class_idx to the actual class label
# using the label mapping from the original model if available.
```

## Quantization Details

This model was quantized using dynamic quantization with ONNX Runtime.

## Files

* `crop_leaf_diseases_vit.onnx`: The original ONNX model (before quantization).
* `crop_leaf_diseases_vit.quant.onnx`: The quantized ONNX model (INT8) find  [colab link](https://colab.research.google.com/drive/1uECBjB5J9ESsG4gIADbE9NQ9dp45btPz?usp=sharing).