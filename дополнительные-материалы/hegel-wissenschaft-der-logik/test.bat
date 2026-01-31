@echo off
chcp 65001 >nul

REM === FOLDERS ===
mkdir "1 SEIN"
mkdir "2 WESEN"
mkdir "3 BEGRIFF"

REM === 1 SEIN (1.1 – 3.3) ===
cd "1 SEIN"
echo.> "1.1 Sein.md"
echo.> "1.2 Nichts.md"
echo.> "1.3 Werden.md"
echo.> "2.1 Dasein.md"
echo.> "2.2 Endlichkeit.md"
echo.> "2.3 Unendlichkeit.md"
echo.> "3.1 Fürsichsein.md"
echo.> "3.2 Quantität.md"
echo.> "3.3 Maß.md"
cd ..

REM === 2 WESEN (2.1.1 – 2.3.3) ===
cd "2 WESEN"
echo.> "2.1.1 Schein.md"
echo.> "2.1.2 Identität.md"
echo.> "2.1.3 Unterschied.md"
echo.> "2.2.1 Widerspruch.md"
echo.> "2.2.2 Grund.md"
echo.> "2.2.3 Existenz.md"
echo.> "2.3.1 Erscheinung.md"
echo.> "2.3.2 Wirklichkeit.md"
echo.> "2.3.3 Absolutes Verhältnis.md"
cd ..

REM === 3 BEGRIFF (3.1.1 – 3.3.3) ===
cd "3 BEGRIFF"
echo.> "3.1.1 Begriff.md"
echo.> "3.1.2 Urteil.md"
echo.> "3.1.3 Schluß.md"
echo.> "3.2.1 Mechanismus.md"
echo.> "3.2.2 Chemismus.md"
echo.> "3.2.3 Teleologie.md"
echo.> "3.3.1 Leben.md"
echo.> "3.3.2 Idee des Erkennens.md"
echo.> "3.3.3 Absolute Idee.md"
cd ..

echo Done.
