import os
import shutil
import unittest

from processing.silence import run_remove_silence
from processing.combine import run_combine
from processing.captions import run_captions

class TestVideoProcessing(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.test_video = "test_dummy.mp4"
        cls.output_dir = "test_dummy"
        
    @classmethod
    def tearDownClass(cls):
        # Clean up test outputs
        if os.path.exists(cls.output_dir):
            shutil.rmtree(cls.output_dir)
        for filename in ["test_dummy_combined.mp4", "test_dummy.srt"]:
            if os.path.exists(filename):
                os.remove(filename)

    def test_01_remove_silence(self):
        print("\n--- Testing Silence Removal ---")
        result = run_remove_silence(
            input_path=self.test_video,
            noise="-30dB",
            duration=0.5,
            pad_start=0.15,
            pad_end=0.4,
            use_copy=False,
            dry_run=False,
            log=print
        )
        self.assertIsNotNone(result)
        self.assertTrue(len(result["silences"]) >= 1)
        # The silence should be detected around 2.0s to 4.0s
        silence = result["silences"][0]
        print(f"Detected silence: {silence}")
        self.assertAlmostEqual(silence["start"], 2.0, delta=0.5)
        self.assertAlmostEqual(silence["end"], 4.0, delta=0.5)
        
        # Verify that output directory and clips exist
        self.assertTrue(os.path.exists(self.output_dir))
        clips = os.listdir(self.output_dir)
        print(f"Generated clips: {clips}")
        self.assertTrue(len(clips) >= 2)
        
    def test_02_combine_clips(self):
        print("\n--- Testing Combining Clips ---")
        # Ensure we have the clips from silence removal
        self.assertTrue(os.path.exists(self.output_dir))
        
        result = run_combine(
            folder=self.output_dir,
            zoom=10,
            start_zoomed=False,
            output="test_dummy_combined.mp4",
            log=print
        )
        self.assertIsNotNone(result)
        self.assertTrue(os.path.exists("test_dummy_combined.mp4"))
        self.assertTrue(os.path.getsize("test_dummy_combined.mp4") > 0)
        print(f"Combined video path: {result['output_path']}")

    def test_03_captions(self):
        print("\n--- Testing Caption Extraction ---")
        # Use 'tiny' model for fast test download/run
        result = run_captions(
            input_path=self.test_video,
            model="tiny",
            language="en",
            output="test_dummy.srt",
            log=print
        )
        self.assertIsNotNone(result)
        self.assertTrue(os.path.exists("test_dummy.srt"))
        print(f"Captions path: {result['output_path']}")
        
        # Read caption contents
        with open("test_dummy.srt", "r") as f:
            content = f.read()
            print("SRT Preview (should be empty):")
            print(repr(content))
            print("SRT Preview:")
            print(content[:300])

if __name__ == "__main__":
    unittest.main()
