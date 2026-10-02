import importlib.util
import socket
import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

SCRIPT_PATH = SCRIPTS_DIR / "launch_game.py"
spec = importlib.util.spec_from_file_location("launch_game_test", SCRIPT_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class LaunchGameTests(unittest.TestCase):
    def test_find_available_port_finds_open_port(self):
        port = module.find_available_port(host="127.0.0.1", starting_port=8080)
        self.assertIsInstance(port, int)
        self.assertGreaterEqual(port, 8080)

        # Test socket binding can succeed
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(("127.0.0.1", port))

    def test_is_built_detects_distribution(self):
        self.assertTrue(module.is_built(module.ROOT_DIR))

    def test_build_only_argument_executes_cleanly(self):
        exit_code = module.main(["--build-only"])
        self.assertEqual(exit_code, 0)
        self.assertTrue(module.is_built(module.ROOT_DIR))

    def test_handler_adds_cache_control_headers(self):
        handler_cls = module.TacticalHTTPRequestHandler
        self.assertTrue(hasattr(handler_cls, "end_headers"))
        self.assertTrue(hasattr(handler_cls, "log_message"))


if __name__ == "__main__":
    unittest.main()
