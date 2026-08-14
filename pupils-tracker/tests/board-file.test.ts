import { describe, expect, it } from "vitest";
import { classifyBoardFile } from "@/lib/useBoardDocument";

describe("classifyBoardFile", () => {
  it("treats PowerPoint as ppt so the board can show the export hint", () => {
    expect(classifyBoardFile("week1.pptx")).toBe("ppt");
    expect(classifyBoardFile("week1.ppt")).toBe("ppt");
    expect(
      classifyBoardFile("slides", "application/vnd.ms-powerpoint")
    ).toBe("ppt");
  });

  it("classifies images, PDFs and video for the board and the overlay", () => {
    expect(classifyBoardFile("flashcard.png", "image/png")).toBe("image");
    expect(classifyBoardFile("photo.JPG", "image/jpeg")).toBe("image");
    expect(classifyBoardFile("sticker.webp")).toBe("image");
    expect(classifyBoardFile("book.pdf", "application/pdf")).toBe("pdf");
    expect(classifyBoardFile("notes.PDF")).toBe("pdf");
    expect(classifyBoardFile("clip.mp4", "video/mp4")).toBe("video");
    expect(classifyBoardFile("clip.webm")).toBe("video");
  });

  it("sends audio (including WMA) to the player bar, not the overlay", () => {
    expect(classifyBoardFile("dictation.mp3", "audio/mpeg")).toBe("audio");
    expect(classifyBoardFile("track.wma")).toBe("wma");
    expect(classifyBoardFile("track.asf")).toBe("wma");
  });

  it("rejects files the board cannot open", () => {
    expect(classifyBoardFile("notes.docx")).toBe("unsupported");
    expect(classifyBoardFile("data.csv", "text/csv")).toBe("unsupported");
  });
});
