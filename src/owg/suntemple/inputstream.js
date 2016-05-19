function injectInputStream(referenceTestFrameNumber) { 
if (referenceTestFrameNumber == 1) simulateMouseEvent("mousemove", 0.3925679440109583, 0.220988339811216, 0);
if (referenceTestFrameNumber == 1) simulateMouseEvent("mousedown", 0.3925679440109583, 0.220988339811216, 0);
if (referenceTestFrameNumber == 2) simulateMouseEvent("mouseup", 0.3925679440109583, 0.220988339811216, 0);
if (referenceTestFrameNumber == 2) simulateKeyEvent("keydown", 77, 0);
if (referenceTestFrameNumber == 3) simulateKeyEvent("keyup", 77, 0);
}
