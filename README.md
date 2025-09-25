# AI-VISION-GLASSES-V1

AI vision glasses for the Visually Impaired/ Blind community
AI usecase running on LLM that does object/image detection + text detection + audio, enabling blind users to read text, identify faces, get semantic descriptions

Integration of object detection + OCR + Test to Speech

🛠 How You Can Use this repo to Adapt

Modularize: Pick modules you need (e.g. object detection, OCR, face recognition, distance estimation) and integrate them into your own architecture.

Hardware adaptation: you might want to port to a more powerful embedded device (e.g. Jetson, edge-AI modules) for better performance.

Latency & real-time: Those repos often serve as proofs-of-concept; improving inference speed, model optimization, and resource usage will be key.

Audio feedback design: The way the system speaks (timing, priority, phrasing) matters a lot for usability.

Edge vs cloud tradeoffs: Use smart offloading (some tasks on-device, some on server) as in the iEARS project.
