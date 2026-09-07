import { readFile } from "fs/promises"
import path from "path"
import type { Scene } from "./types"

export type ImageFilePart = {
    type: "file"
    data: Buffer
    mediaType: string
}

async function readSceneImage(
    filePath: string,
): Promise<ImageFilePart> {
    const absolutePath = path.join(
        process.cwd(),
        "public",
        filePath.replace(/^\/+/, ""),
    )

    const buffer = await readFile(absolutePath)

    const extension = path
        .extname(absolutePath)
        .toLowerCase()

    let mediaType = "image/png"

    if (
        extension === ".jpg" ||
        extension === ".jpeg"
    ) {
        mediaType = "image/jpeg"
    } else if (extension === ".webp") {
        mediaType = "image/webp"
    } else if (extension === ".gif") {
        mediaType = "image/gif"
    }

    return {
        type: "file",
        data: buffer,
        mediaType,
    }
}

export async function getSceneImageParts(
    scene: Scene,
): Promise<ImageFilePart[]> {
    const imagePaths: string[] = []

    // Single optical scene
    if (scene.mode === "single") {
        if (scene.images.optical) {
            imagePaths.push(scene.images.optical)
        }
    }

    // Optical + SAR scene
    if (scene.mode === "pair") {
        if (scene.images.optical) {
            imagePaths.push(scene.images.optical)
        }

        if (scene.images.sar) {
            imagePaths.push(scene.images.sar)
        }
    }

    // Before + after scene
    if (scene.mode === "bitemporal") {
        if (scene.images.before) {
            imagePaths.push(scene.images.before)
        }

        if (scene.images.after) {
            imagePaths.push(scene.images.after)
        }
    }

    const parts: ImageFilePart[] = []

    for (const imagePath of imagePaths) {
        try {
            const part = await readSceneImage(imagePath)

            parts.push(part)

            console.log(
                `[satquery] loaded scene image: ${imagePath}`,
            )
        } catch (error) {
            console.error(
                `[satquery] unable to load scene image ${imagePath}:`,
                error instanceof Error
                    ? error.message
                    : error,
            )
        }
    }

    return parts
}