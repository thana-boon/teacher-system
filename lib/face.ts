// Client-only helpers around @vladmandic/face-api.
// Imported dynamically so nothing touches the browser APIs during SSR.

type FaceApi = typeof import("@vladmandic/face-api");

let faceapi: FaceApi | null = null;
let modelsLoaded = false;

const MODEL_URL = "/models";

export const MATCH_THRESHOLD = 0.5; // lower = stricter (euclidean distance on descriptors)

async function getApi(): Promise<FaceApi> {
  if (!faceapi) faceapi = await import("@vladmandic/face-api");
  return faceapi;
}

export async function loadFaceModels(): Promise<void> {
  const api = await getApi();
  if (modelsLoaded) return;
  await Promise.all([
    api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

async function detectorOptions() {
  const api = await getApi();
  return new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
}

/** Detect a single face in the input and return its 128-d descriptor, or null. */
export async function getDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<number[] | null> {
  const api = await getApi();
  const opts = await detectorOptions();
  const res = await api
    .detectSingleFace(input, opts)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return res ? Array.from(res.descriptor) : null;
}

export type FaceCandidate = {
  teacherId: string;
  name: string;
  descriptors: number[][];
};

export type MatchResult = { teacherId: string; name: string; distance: number };

/** Find the closest enrolled teacher to `descriptor` within MATCH_THRESHOLD. */
export async function findMatch(
  descriptor: number[],
  candidates: FaceCandidate[],
): Promise<MatchResult | null> {
  const api = await getApi();
  const query = new Float32Array(descriptor);
  let best: MatchResult | null = null;
  for (const c of candidates) {
    for (const d of c.descriptors) {
      const dist = api.euclideanDistance(query, new Float32Array(d));
      if (!best || dist < best.distance) {
        best = { teacherId: c.teacherId, name: c.name, distance: dist };
      }
    }
  }
  return best && best.distance <= MATCH_THRESHOLD ? best : null;
}
