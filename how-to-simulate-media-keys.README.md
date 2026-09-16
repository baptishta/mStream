**FOR WINDOWS ONLY!**

Use **[AutoHotkey v2](https://www.autohotkey.com/)**

Script which creates a GUI window with media buttons and sends the events to Chrome:

Copy `media_keys_simulator.ahk` and `media_keys_simulator.exe` to a Windows folder. Run `media_keys_simulator.exe`.

```
#Requires AutoHotkey v2.0

myGui := Gui("+AlwaysOnTop", "Chrome Media Controls")
myGui.SetFont("s12")

myGui.AddButton("w100 h40", "⏮ Previous").OnEvent("Click", Previous)
myGui.AddButton("x+10 w100 h40", "⏯ Play/Pause").OnEvent("Click", PlayPause)
myGui.AddButton("x+10 w100 h40", "⏭ Next").OnEvent("Click", Next)

myGui.Show()

Previous(*) {
    WinActivate "ahk_exe chrome.exe"
    Sleep 50
    Send "{Media_Prev}"
}

PlayPause(*) {
    WinActivate "ahk_exe chrome.exe"
    Sleep 50
    Send "{Media_Play_Pause}"
}

Next(*) {
    WinActivate "ahk_exe chrome.exe"
    Sleep 50
    Send "{Media_Next}"
}
```