---
license: cc-by-4.0
library_name: timm
pipeline_tag: image-classification
tags:
- agriculture
- plant-disease
- crop-disease
- convnext
- image-classification
datasets:
- enalis/LeafNet
---

# Multi-crop disease models (42 crops)

Leaf-photo models of the **Multi-Crop Disease Decision Support System**: two **crop detectors** that recognise which crop a leaf
belongs to, and one **disease model per crop** for 42 crops. All are ConvNeXt-Small (timm, `convnext_small.fb_in22k_ft_in1k`
fine-tuned), 224 × 224 RGB input.

They power **Agri ▸ Diagnose crop disease** in [LULC Fetch](https://github.com/agritechixr/lulc-fetch), which downloads each model
here the first time it's needed. The matching Q&A knowledge base is [ixrbhii/crop-disease-qa](https://huggingface.co/datasets/ixrbhii/crop-disease-qa).

## Just one crop?

Every model also has **its own repository**, ready for timm (listed in the table below, and in the collection
[Multi-crop disease models (42 crops)](https://huggingface.co/collections/ixrbhii/multi-crop-disease-models-42-crops-6ac0a3291f2153fa716e2993)):

```python
import timm
model = timm.create_model("hf-hub:ixrbhii/tomato-disease-convnext", pretrained=True)   # labels: model.pretrained_cfg["label_names"]
```

Crop detectors: [leaf-crop-detector-16-convnext](https://huggingface.co/ixrbhii/leaf-crop-detector-16-convnext) and
[leaf-crop-detector-36-convnext](https://huggingface.co/ixrbhii/leaf-crop-detector-36-convnext). Or download one folder of
this repository: `hf download ixrbhii/multicrop-disease-models --include "Tomato/*"`.

## Files

```
<Crop>/model.safetensors        disease model (half precision, ~100 MB)
<Crop>/config.json              arch, classes (output order), friendly labels, input size, normalisation, test scores
detectors/original/…            crop detector, 16 crops (99.8 % on 2,621 test photos)
detectors/new/…                 added-crops detector, 36 crops incl. Pepper, Raspberry, Sorghum, Squash (98.3 % on 6,167 test photos)
index.json                      every file with its size and SHA-256
```

Weights are stored in half precision (converted from the original float32 checkpoints; checked to give the same top-1 answer
on sample leaf photos). Load them in float32 for CPU use.

## Use

```python
import json, timm, torch
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file
from PIL import Image
import numpy as np

repo, crop = "ixrbhii/multicrop-disease-models", "Tomato"
cfg = json.load(open(hf_hub_download(repo, f"{crop}/config.json")))
net = timm.create_model(cfg["arch"], pretrained=False, num_classes=len(cfg["classes"]))
net.load_state_dict({k: v.float() for k, v in load_file(hf_hub_download(repo, f"{crop}/model.safetensors")).items()})
net.eval()

img = Image.open("leaf.jpg").convert("RGB").resize((224, 224), Image.BILINEAR)
x = (np.asarray(img, np.float32) / 255 - cfg["mean"]) / cfg["std"]
p = torch.softmax(net(torch.from_numpy(x.transpose(2, 0, 1)).float()[None]), 1)[0]
for i in p.argsort(descending=True)[:3]:
    print(cfg["labels"][i], f"{100 * p[i]:.1f} %")
```

**Photo-first flow** (as in the app): run `detectors/original`; if `detectors/new` names a crop outside
Apple, Mango, Cashew, Cherry, Strawberry, Rose with at least 80 % confidence, use that instead. Refuse the photo when the crop
detector is below 60 % or the disease model below 45 % sure, then run the crop's disease model.

## Models and test results

Test accuracy is on held-out photos from the same datasets the models were trained on: real field photos score lower.
Mulberry's model tells **varieties**, not diseases.

| Crop | Own repository | Folder here | Classes | Test accuracy | Macro-F1 | Test photos |
|---|---|---|---|---|---|---|
| Apple | [apple-disease-convnext](https://huggingface.co/ixrbhii/apple-disease-convnext) | `Apple/` | Apple Scab & Rust, Gray Spot, Apple Scab, Brown Spot, Alternaria Leaf Spot, Healthy, Marssonina Blotch, Root Rot / Collar Rot | 99.2% | 0.989 | 2,308 |
| Apricot | [apricot-disease-convnext](https://huggingface.co/ixrbhii/apricot-disease-convnext) | `Apricot/` | Blight, Healthy, Shot Hole | 100.0% | 1.000 | 277 |
| Banana | [banana-disease-convnext](https://huggingface.co/ixrbhii/banana-disease-convnext) | `Banana/` | Bract Mosaic Virus Disease, Healthy, Insect Pest Damage, Moko Disease, Yellow Sigatoka Disease, Black Streak, Bunchy Top, Cordana Spot, Fruit Anthracnose, Panama Disease (Fusarium Wilt) | 98.8% | 0.985 | 748 |
| Betel | [betel-disease-convnext](https://huggingface.co/ixrbhii/betel-disease-convnext) | `Betel/` | Bacterial Leaf Disease, Dried Leaf, Fungal Brown Spot, Healthy | 100.0% | 1.000 | 376 |
| Bitter Gourd | [bitter-gourd-disease-convnext](https://huggingface.co/ixrbhii/bitter-gourd-disease-convnext) | `Bitter_gourd/` | Downy Mildew, Fusarium Wilt, Healthy, Mosaic Virus, Nutrient Deficiency | 94.9% | 0.953 | 413 |
| Black Pepper | [black-pepper-disease-convnext](https://huggingface.co/ixrbhii/black-pepper-disease-convnext) | `Black_Pepper/` | Healthy, Leaf Blight, Yellow Mottle Virus | 100.0% | 1.000 | 84 |
| Bottle Gourd | [bottle-gourd-disease-convnext](https://huggingface.co/ixrbhii/bottle-gourd-disease-convnext) | `Bottle_gourd/` | Alternaria Leaf Blight, Anthracnose, Downy Mildew, Healthy, Mosaic Virus, Nutrient Deficiency | 92.8% | 0.901 | 428 |
| Brinjal | [brinjal-disease-convnext](https://huggingface.co/ixrbhii/brinjal-disease-convnext) | `Brinjal/` | Begomovirus, Verticillium Wilt, Nutrient Deficiency, Shoot and Fruit Borer, MIT/EB Pest Damage, Healthy, Cercospora Spot, Phomopsis Fruit Rot | 98.0% | 0.976 | 587 |
| Cashew | [cashew-disease-convnext](https://huggingface.co/ixrbhii/cashew-disease-convnext) | `Cashew/` | Anthracnose, Gummosis, Healthy, Leaf Miner, Red Rust | 97.4% | 0.978 | 820 |
| Cassava | [cassava-disease-convnext](https://huggingface.co/ixrbhii/cassava-disease-convnext) | `Cassava/` | Healthy, Bacterial Blight, Brown Spot, Green Mite, Mosaic Virus | 95.3% | 0.955 | 721 |
| Cherry | [cherry-disease-convnext](https://huggingface.co/ixrbhii/cherry-disease-convnext) | `Cherry/` | Leaf Scorch, Healthy, Powdery Mildew, Brown Spot, Purple Spot, Shot Hole | 99.4% | 0.992 | 1,126 |
| Chrysanthemum | [chrysanthemum-disease-convnext](https://huggingface.co/ixrbhii/chrysanthemum-disease-convnext) | `Chrysanthemum/` | Bacterial Leaf Spot, Healthy, Septoria Leaf Spot | 100.0% | 1.000 | 372 |
| Citrus (Orange / Lemon) | [citrus-disease-convnext](https://huggingface.co/ixrbhii/citrus-disease-convnext) | `Citrus/` | Bacterial Blight, Black Spot, Canker, Dry Leaf, Healthy, Leaf Curl Virus, Sooty Mould, Spider Mites | 99.5% | 0.995 | 425 |
| Coconut | [coconut-disease-convnext](https://huggingface.co/ixrbhii/coconut-disease-convnext) | `Coconut/` | Bud Root Dropping, Bud Rot, Coconut Caterpillar Infestation (caterpillars), Coconut Caterpillar Infestation (leaflet damage), Gray Leaf Spot, Healthy, Leaf Rot, Stem Bleeding, Weligama Coconut Leaf Wilt — drying of leaflets, Weligama Coconut Leaf Wilt — flaccidity, Weligama Coconut Leaf Wilt — yellowing | 99.9% | 0.998 | 1,402 |
| Coffee | [coffee-disease-convnext](https://huggingface.co/ixrbhii/coffee-disease-convnext) | `Coffee/` | Berry Blotch, Cercospora Brown Eye Spot, Healthy, Leaf Miner, Phoma, Red Spider Mite, Rust | 94.7% | 0.809 | 506 |
| Cucumber | [cucumber-disease-convnext](https://huggingface.co/ixrbhii/cucumber-disease-convnext) | `Cucumber/` | Angular Leaf Spot, Anthracnose, Bacterial Wilt, Downy Mildew, Gummy Stem Blight, Healthy, Nutrient Deficiency, Powdery Mildew | 97.9% | 0.971 | 819 |
| Cucurbit (Pumpkin / Melon) | [cucurbit-disease-convnext](https://huggingface.co/ixrbhii/cucurbit-disease-convnext) | `Cucurbit/` | Downy Mildew, Healthy, Leaf Curl, Mosaic Virus | 99.3% | 0.992 | 556 |
| Custard Apple | [custard-apple-disease-convnext](https://huggingface.co/ixrbhii/custard-apple-disease-convnext) | `Custard_apple/` | Anthracnose, Black Canker, Healthy, Stressed Plant, Diplodia Rot, Leaf Spot (leaves), Leaf Spot (fruit), Mealy Bug | 99.4% | 0.995 | 1,129 |
| Fig | [fig-disease-convnext](https://huggingface.co/ixrbhii/fig-disease-convnext) | `Fig/` | Blight, Brown Spot, Healthy, Rust | 99.5% | 0.993 | 372 |
| Grape | [grape-disease-convnext](https://huggingface.co/ixrbhii/grape-disease-convnext) | `Grape/` | Anthracnose, Bacterial Rot, Black Rot, Brown Spot, Downy Mildew, Esca Black Measles, Healthy, Leaf Blight, Mites, Powdery Mildew, Shot Hole | 94.0% | 0.942 | 1,461 |
| Guava | [guava-disease-convnext](https://huggingface.co/ixrbhii/guava-disease-convnext) | `Guava/` | Healthy, Rust / Leaf Spot, Tea Mosquito Bug / Thrips, Anthracnose, Multiple Diseases, YLD | 100.0% | 1.000 | 1,345 |
| Loquat | [loquat-disease-convnext](https://huggingface.co/ixrbhii/loquat-disease-convnext) | `Loquat/` | Healthy, Leaf Spot | 96.2% | 0.961 | 212 |
| Maize | [maize-disease-convnext](https://huggingface.co/ixrbhii/maize-disease-convnext) | `Maize/` | Common Rust, Fall Armyworm, Grasshopper Damage, Gray Leaf Spot, Healthy, Holcus Leaf Spot, Leaf Beetle, Lethal Necrosis, Streak Virus, Northern Leaf Blight, Smut | 92.9% | 0.936 | 1,281 |
| Mango | [mango-disease-convnext](https://huggingface.co/ixrbhii/mango-disease-convnext) | `Mango/` | Anthracnose, Bacterial Canker, Cutting Weevil, Die Back, Gall Midge, Healthy, Powdery Mildew, Sooty Mould | 99.8% | 0.998 | 527 |
| Mulberry | [mulberry-variety-convnext](https://huggingface.co/ixrbhii/mulberry-variety-convnext) | `Mulberry/` | ChiangMai60 (variety), RedKing (variety), WhiteKing (variety), BlackOodTurkey (variety), Taiwan Strawberry (variety), BlackAustralia (variety), Buriram60 (variety), Kamphaengsaeng42 (variety), TaiwanMeacho (variety), ChiangMaiBuriram60 (variety) | 97.8% | 0.977 | 671 |
| Okra | [okra-disease-convnext](https://huggingface.co/ixrbhii/okra-disease-convnext) | `okra/` | Alternaria Leaf Spot, Cercospora Leaf Spot, Downy Mildew, Healthy, Leaf Curl Virus, Phyllosticta Leaf Spot | 97.5% | 0.977 | 399 |
| Papaya | [papaya-disease-convnext](https://huggingface.co/ixrbhii/papaya-disease-convnext) | `Papaya/` | Anthracnose, Bacterial Spot, Leaf Curl, Healthy, Mealybug, Mite Disease, Mosaic, Ringspot | 97.1% | 0.973 | 2,023 |
| Peach | [peach-disease-convnext](https://huggingface.co/ixrbhii/peach-disease-convnext) | `Peach/` | Bacterial Spot, Brown Rot, Healthy, Leaf Curl | 98.2% | 0.974 | 284 |
| Pear | [pear-disease-convnext](https://huggingface.co/ixrbhii/pear-disease-convnext) | `Pear/` | Black Spot, Fire Blight, Healthy, Leaf Spot, Slug | 96.8% | 0.972 | 631 |
| Pomegranate | [pomegranate-disease-convnext](https://huggingface.co/ixrbhii/pomegranate-disease-convnext) | `pomrgranet/` | Alternaria, Anthracnose, Bacterial Blight, Cercospora, Healthy | 99.2% | 0.991 | 638 |
| Potato | [potato-disease-convnext](https://huggingface.co/ixrbhii/potato-disease-convnext) | `Potato/` | Early Blight, Healthy, Late Blight | 96.0% | 0.971 | 247 |
| Rice | [rice-disease-convnext](https://huggingface.co/ixrbhii/rice-disease-convnext) | `Rice/` | Bacterial Blight, Bacterial Leaf Streak, Bacterial Panicle Blight, Blast, Brown Spot, Dead Heart, Downy Mildew, Healthy, Hispa, Leaf Scald, Narrow Brown Leaf Spot, Neck Blast, Sheath Blight, Tungro | 93.5% | 0.940 | 1,579 |
| Ridge Gourd | [ridge-gourd-disease-convnext](https://huggingface.co/ixrbhii/ridge-gourd-disease-convnext) | `Ridge_gourd/` | Healthy, Leaf Miner, Mosaic Virus, Nutrient Deficiency | 91.0% | 0.924 | 477 |
| Rose | [rose-disease-convnext](https://huggingface.co/ixrbhii/rose-disease-convnext) | `Rose/` | Black Spot, Downy Mildew, Insect Hole, Healthy, Rust, Rose Slug (Sawfly), Yellow Mosaic Virus, Blight | 99.3% | 0.992 | 1,097 |
| Snake Gourd | [snake-gourd-disease-convnext](https://huggingface.co/ixrbhii/snake-gourd-disease-convnext) | `Snake_gourd/` | Anthracnose, Healthy, Nutrient Deficiency, Yellowing | 93.4% | 0.940 | 152 |
| Soybean | [soybean-disease-convnext](https://huggingface.co/ixrbhii/soybean-disease-convnext) | `Soybean/` | Downy Mildew, Frogeye Leaf Spot, Healthy, Mosaic Virus, Rust, Septoria Brown Spot | 91.7% | 0.881 | 336 |
| Strawberry | [strawberry-disease-convnext](https://huggingface.co/ixrbhii/strawberry-disease-convnext) | `Strawberry/` | Healthy, Leaf Scorch, Anthracnose | 99.8% | 0.995 | 459 |
| Sugarcane | [sugarcane-disease-convnext](https://huggingface.co/ixrbhii/sugarcane-disease-convnext) | `Sugarcane/` | Banded Chlorosis, Brown Rust, Brown Spot, Dried Leaves, Grassy Shoot, Healthy, Pokkah Boeng, Sett Rot, Smut, Yellow Leaf, Mosaic Virus | 92.6% | 0.899 | 689 |
| Tea | [tea-disease-convnext](https://huggingface.co/ixrbhii/tea-disease-convnext) | `Tea/` | Healthy, Red Leaf Spot, Red Scab, Leaf Blight | 100.0% | 1.000 | 160 |
| Tomato | [tomato-disease-convnext](https://huggingface.co/ixrbhii/tomato-disease-convnext) | `Tomato/` | Bacterial Spot, Early Blight, Fusarium Wilt, Healthy, Late Blight, Leaf Miner, Leaf Mold, Mosaic Virus, Septoria Leaf Spot, Spider Mites, Target Spot, Verticillium Wilt, Yellow Leaf Curl Virus | 93.4% | 0.932 | 1,796 |
| Walnut | [walnut-disease-convnext](https://huggingface.co/ixrbhii/walnut-disease-convnext) | `Walnut/` | Anthracnose, Blotch, Gall Mite, Healthy, Shot Hole | 99.7% | 0.996 | 582 |
| Watermelon | [watermelon-disease-convnext](https://huggingface.co/ixrbhii/watermelon-disease-convnext) | `Watermelon/` | Anthracnose, Downy Mildew, Healthy, Mosaic Virus | 100.0% | 1.000 | 300 |

## Training data

- **16 crops** (Apple, Banana, Brinjal, Cashew, Cherry, Coconut, Custard Apple, Guava, Mango, Mulberry, Okra, Papaya, Pomegranate,
  Rose, Strawberry, Watermelon) and the original crop detector: public leaf-disease photo datasets, including PlantVillage
  (CC0) and MangoLeafBD (CC-BY-4.0).
- **26 crops** and the added-crops detector: [LeafNet](https://huggingface.co/datasets/enalis/LeafNet) (CC-BY-4.0) and the authors'
  own field photos.

## Limitations

- Leaves of crops the detectors don't know can be taken for a known crop; the confidence limits catch only part of them.
- Coffee's *Cercospora brown eye spot* is usually missed (few training photos).
- One leaf per photo, filling most of the picture, in daylight and in focus, works best.
- A diagnosis supports, but doesn't replace, a local agriculture expert.

## Licence

CC-BY-4.0. Please credit "Multi-crop disease models, IXR (agritechixr)", and the training datasets above.
