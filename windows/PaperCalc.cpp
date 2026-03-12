// PaperCalc.cpp --- PaperCalcãNìÆÉvÉçÉOÉâÉÄ
// Author: katahiromz
// License: MIT
#include <windows.h>
#include <commctrl.h>
#include <shlwapi.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <tchar.h>

#ifndef _countof
    #define _countof(array) (sizeof(array) / sizeof(array[0]))
#endif

void ShowError(void)
{
    TCHAR szText[128], szTitle[128];
    LoadString(NULL, 100, szTitle, _countof(szTitle));
    LoadString(NULL, 101, szText, _countof(szText));
    MessageBox(NULL, szText, szTitle, MB_ICONERROR);
}

BOOL FindMSEdge(LPTSTR pszFullPath, INT cchFullPath) {
    static const LPCTSTR paths[] = {
        TEXT("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"),
        TEXT("C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe"),
        TEXT("C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe"),
        TEXT("C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"),
        TEXT("C:\\Program Files\\Microsoft\\Edge Beta\\Application\\msedge.exe"),
        TEXT("C:\\Program Files\\Microsoft\\Edge Dev\\Application\\msedge.exe"),
        TEXT("%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe"),
    };
    for (size_t i = 0; i < _countof(paths); ++i) {
        ExpandEnvironmentStrings(paths[i], pszFullPath, cchFullPath);
        if (PathFileExists(pszFullPath))
            return TRUE;
    }

    lstrcpyn(pszFullPath, TEXT("msedge.exe"), cchFullPath);
    return FALSE;
}

INT WINAPI
WinMain(HINSTANCE   hInstance,
        HINSTANCE   hPrevInstance,
        LPSTR       lpCmdLine,
        INT         nCmdShow)
{
    InitCommonControls();

    TCHAR szPath[MAX_PATH], szParam[MAX_PATH * 2];

    GetModuleFileName(NULL, szPath, _countof(szPath));
    PathRemoveFileSpec(szPath);
    PathAppend(szPath, TEXT("assets\\index.html"));

    TCHAR msedge[MAX_PATH];
    FindMSEdge(msedge, _countof(msedge));

    _sntprintf(szParam, _countof(szParam), TEXT("--new-window --app=\"%s\""), szPath);

    if ((INT_PTR)ShellExecute(NULL, NULL, msedge, szParam, NULL, SW_SHOWNORMAL) <= 32) {
        ShowError();
        return 1;
    }

    return 0;
}
