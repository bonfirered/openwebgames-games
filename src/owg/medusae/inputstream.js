
function injectInputStream(referenceTestFrameNumber) { 
if (referenceTestFrameNumber == 105) simulateMouseEvent("mousemove", 0.48243045387994143, 0.2578125, 0);
if (referenceTestFrameNumber == 115) simulateMouseEvent("mousedown", 0.48243045387994143, 0.2578125, 0);
if (referenceTestFrameNumber == 124) simulateMouseEvent("mousemove", 0.48243045387994143, 0.2565104166666667, 0);
if (referenceTestFrameNumber == 127) simulateMouseEvent("mouseup", 0.48243045387994143, 0.2565104166666667, 0);
if (referenceTestFrameNumber == 127) simulateMouseEvent("mousemove", 0.48243045387994143, 0.2578125, 0);
if (referenceTestFrameNumber == 135) simulateMouseEvent("mousemove", 0.4816983894582723, 0.2578125, 0);
if (referenceTestFrameNumber == 135) simulateMouseEvent("mousemove", 0.48096632503660325, 0.2578125, 0);
if (referenceTestFrameNumber == 136) simulateMouseEvent("mousemove", 0.479502196193265, 0.2565104166666667, 0);
if (referenceTestFrameNumber == 136) simulateMouseEvent("mousemove", 0.4780380673499268, 0.2565104166666667, 0);
if (referenceTestFrameNumber == 136) simulateMouseEvent("mousemove", 0.4751098096632504, 0.2526041666666667, 0);
if (referenceTestFrameNumber == 136) simulateMouseEvent("mousemove", 0.47144948755490484, 0.25, 0);
if (referenceTestFrameNumber == 137) simulateMouseEvent("mousemove", 0.4677891654465593, 0.24869791666666666, 0);
if (referenceTestFrameNumber == 137) simulateMouseEvent("mousemove", 0.4663250366032211, 0.24739583333333334, 0);
if (referenceTestFrameNumber == 137) simulateMouseEvent("mousemove", 0.46486090775988287, 0.24609375, 0);
if (referenceTestFrameNumber == 137) simulateMouseEvent("mousemove", 0.4633967789165447, 0.24479166666666666, 0);
if (referenceTestFrameNumber == 137) simulateMouseEvent("mousemove", 0.46046852122986826, 0.2421875, 0);
if (referenceTestFrameNumber == 137) simulateMouseEvent("mousemove", 0.45900439238653, 0.2421875, 0);
if (referenceTestFrameNumber == 137) simulateMouseEvent("mousemove", 0.4560761346998536, 0.24088541666666666, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.45168374816983897, 0.23828125, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.4494875549048316, 0.23697916666666666, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.4472913616398243, 0.23697916666666666, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.445095168374817, 0.23697916666666666, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.4443631039531479, 0.234375, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.4428989751098097, 0.234375, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.4407027818448023, 0.23307291666666666, 0);
if (referenceTestFrameNumber == 138) simulateMouseEvent("mousemove", 0.438506588579795, 0.23307291666666666, 0);
if (referenceTestFrameNumber == 139) simulateMouseEvent("mousemove", 0.42972181551976574, 0.23046875, 0);
if (referenceTestFrameNumber == 139) simulateMouseEvent("mousemove", 0.4238653001464129, 0.22916666666666666, 0);
if (referenceTestFrameNumber == 139) simulateMouseEvent("mousemove", 0.42093704245973645, 0.22916666666666666, 0);
if (referenceTestFrameNumber == 140) simulateMouseEvent("mousemove", 0.42020497803806733, 0.2265625, 0);
if (referenceTestFrameNumber == 140) simulateMouseEvent("mousemove", 0.41874084919472915, 0.2265625, 0);
if (referenceTestFrameNumber == 140) simulateMouseEvent("mousemove", 0.41654465592972184, 0.22526041666666666, 0);
if (referenceTestFrameNumber == 140) simulateMouseEvent("mousemove", 0.4150805270863836, 0.22526041666666666, 0);
if (referenceTestFrameNumber == 141) simulateMouseEvent("mousemove", 0.4128843338213763, 0.22526041666666666, 0);
if (referenceTestFrameNumber == 142) simulateMouseEvent("mousemove", 0.41142020497803805, 0.22395833333333334, 0);
if (referenceTestFrameNumber == 150) simulateMouseEvent("mousemove", 0.410688140556369, 0.22135416666666666, 0);
if (referenceTestFrameNumber == 150) simulateMouseEvent("mousemove", 0.410688140556369, 0.21614583333333334, 0);
if (referenceTestFrameNumber == 151) simulateMouseEvent("mousemove", 0.410688140556369, 0.21354166666666666, 0);
if (referenceTestFrameNumber == 152) simulateMouseEvent("mousemove", 0.410688140556369, 0.20833333333333334, 0);
if (referenceTestFrameNumber == 163) simulateMouseEvent("mousedown", 0.4, 0.2, 0);
if (referenceTestFrameNumber == 179) simulateMouseEvent("mousemove", 0.4, 0.2, 0);
if (referenceTestFrameNumber >= 180 && referenceTestFrameNumber < 1500)  {
	var t = (referenceTestFrameNumber - 180) / (1500 - 180);
	simulateMouseEvent("mousemove", 0.4 + t * 0.3, 0.2 + t * 0.2, 0);
}

}
