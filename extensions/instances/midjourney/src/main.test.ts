import { expect, test } from "@jest/globals";
import { MidjourneyInstructions } from "./main";


test("All", async () =>
{
  const string = `{"ImageWidth":960,"ImageHeight":1200,"BitDepth":8,"ColorType":"RGB","Compression":"Deflate/Inflate","Filter":"Adaptive","Interlace":"Noninterlaced","Creation Time":"Thu, 20 Jun 2024 22:50:03 GMT","Author":"Grand Daron","Description":"https://s.mj.run/jhiJzyVBla8 Editorial fashion, photo by Tim Walker, Biomechatronic Chanel girl model within shimmering platinum fluid in code, made of fusion of antimatter, binary code, transistor, microphone, hard drive, static, fiber optics, in designer fashion style --chaos 16 --ar 4:5 --sref 4169606994 --personalize yfbxsj7 Job ID: d95be554-d446-4c51-ad75-e00d9f9bbb35","DigImageGUID":"d95be554-d446-4c51-ad75-e00d9f9bbb35","DigitalSourceType":"https://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"}`;
  const instructions = MidjourneyInstructions.parseMetadata(JSON.parse(string));

  expect(instructions).toBeDefined();
});
