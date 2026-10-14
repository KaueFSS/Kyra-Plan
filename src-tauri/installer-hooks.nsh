; Kyra Plan was called "SentUtility" up to version 1.2.x.
;
; When someone updates, this installs the app under its new name and removes
; the old copy, carrying over the shortcuts and the "start with Windows"
; entry. Nothing the person created is touched: their tasks, events and
; settings live in %APPDATA%\com.sentutility.app, and that folder keeps the
; same identifier on purpose. The old uninstaller runs in /UPDATE mode, which
; never deletes user data.
;
; If anything here fails, the worst outcome is the old app staying installed
; next to the new one. No data is lost either way.

Var KyraHadDesktopShortcut
Var KyraHadStartMenuShortcut
Var KyraHadAutostart

!macro NSIS_HOOK_PREINSTALL
  StrCpy $KyraHadDesktopShortcut "0"
  StrCpy $KyraHadStartMenuShortcut "0"
  StrCpy $KyraHadAutostart "0"

  ; Where the old copy lives (the same key every Tauri NSIS install writes).
  ReadRegStr $R8 SHCTX "${MANUKEY}\SentUtility" ""
  ${If} $R8 != ""
  ${AndIf} ${FileExists} "$R8\uninstall.exe"
    ${If} ${FileExists} "$DESKTOP\SentUtility.lnk"
      StrCpy $KyraHadDesktopShortcut "1"
    ${EndIf}
    ${If} ${FileExists} "$SMPROGRAMS\SentUtility.lnk"
      StrCpy $KyraHadStartMenuShortcut "1"
    ${EndIf}
    ReadRegStr $R7 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SentUtility"
    ${If} $R7 != ""
      StrCpy $KyraHadAutostart "1"
    ${EndIf}

    ; Silent, update mode (keeps data), and wait until it finishes.
    ExecWait '"$R8\uninstall.exe" /S /UPDATE _?=$R8'
    Delete "$R8\uninstall.exe"
    RMDir "$R8"

    ; Old shortcuts and startup entry pointed at the removed program.
    Delete "$DESKTOP\SentUtility.lnk"
    Delete "$SMPROGRAMS\SentUtility.lnk"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SentUtility"
    DeleteRegKey SHCTX "${MANUKEY}\SentUtility"
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Update mode skips creating shortcuts, so recreate the ones the person had.
  ${If} $KyraHadDesktopShortcut == "1"
    CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    !insertmacro SetLnkAppUserModelId "$DESKTOP\${PRODUCTNAME}.lnk"
  ${EndIf}
  ${If} $KyraHadStartMenuShortcut == "1"
    CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    !insertmacro SetLnkAppUserModelId "$SMPROGRAMS\${PRODUCTNAME}.lnk"
  ${EndIf}
  ${If} $KyraHadAutostart == "1"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCTNAME}" '"$INSTDIR\${MAINBINARYNAME}.exe"'
  ${EndIf}
!macroend
