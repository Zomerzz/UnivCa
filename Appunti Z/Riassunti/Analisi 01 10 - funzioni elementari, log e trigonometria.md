# Analisi matematica 01/10 – Funzioni elementari, logaritmi e trigonometria

## <font color="#4bacc6">Parabola, iperbole, circonferenza, ellisse</font>
**parabola** $y = ax^{2} + bx + c$: $a > 0$ concavità verso l'alto $\cup$, $a < 0$ verso il basso $\cap$
**iperbole equilatera** $y = \dfrac{k}{x}$ (cioè $x \cdot y = k$), dominio $x \ne 0$
- $k > 0$ rami nel 1° e 3° quadrante, $k < 0$ nel 2° e 4°

**circonferenza** di centro $(x_0, y_0)$ e raggio r
$$(x - x_{0})^{2} + (y - y_{0})^{2} = r^{2}$$
**ellisse** di centro $(x_0, y_0)$ e semiassi a, b
$$\frac{(x - x_{0})^{2}}{a^{2}} + \frac{(y - y_{0})^{2}}{b^{2}} = 1$$
---
## <font color="#4bacc6">Esponenziale e logaritmo</font>
$y = a^{x}$ con $a > 0$: $a > 1$ crescente, $0 < a < 1$ decrescente, $a = 1$ costante
$y = \log_{a} x$ con $a > 0$, $a \ne 1$, definito per $x > 0$
sono una l'inversa dell'altra:
$$y = e^{x} \iff \ln y = \ln e^{x} = x \ln e \iff x = \ln y$$
$$y = \ln x \iff e^{y} = e^{\ln x} = x$$
> per "liberare" la x si applica ai due lati la funzione inversa: $\ln$ toglie $e^{(\cdot)}$ e viceversa
---
## <font color="#4bacc6">Proprietà dei logaritmi</font>
$$\log 3 + \log 4 = \log(3 \cdot 4) \qquad \log 3 - \log 4 = \log \frac{3}{4}$$
$$\log 3^{x} = x \log 3 \qquad \text{ma} \qquad (\log 3)^{x} \ne x \log 3$$
**cambio di base**
$$\log_{a} b = \frac{\log_{c} b}{\log_{c} a} \qquad \log_{a} b = \frac{1}{\log_{b} a}$$
> attenzione: nella lavagna è scritto $\log(3 + \log 4)$, la proprietà vale per la **somma di due logaritmi**, $\log 3 + \log 4$, non per il log di una somma
---
## <font color="#4bacc6">Circonferenza goniometrica</font>
raggio 1, angolo $a$ misurato dall'asse x in senso antiorario
- $\cos a$ = ascissa del punto sulla circonferenza (segmento q)
- $\sin a$ = ordinata (segmento p)
- $\tan a$ si legge sulla retta tangente in $x = 1$, $\cot a$ sulla retta tangente in $y = 1$
- angoli notevoli: $\frac{\pi}{6}, \frac{\pi}{4}, \frac{\pi}{3}, \frac{\pi}{2}, \pi, \frac{3}{2}\pi, 2\pi$
- segni: 1° quadrante $(x, y)$, 2° $(-x, y)$, 3° $(-x, -y)$, 4° $(x, -y)$
$$\sin^{2} x + \cos^{2} x = 1$$
---
## <font color="#4bacc6">Grafici trigonometrici</font>
- $\sin x$, $\cos x$: periodo $2k\pi$, valori tra $-1$ e $1$
- $\tan x$: periodo $k\pi$, non definita in $x = \frac{\pi}{2} + k\pi$ (asintoti verticali)
- $\arcsin$, $\arccos$, $\arctan$: inverse, ottenute restringendo il dominio dove la funzione è monotona
---
## <font color="#4bacc6">Trasformazioni e modulo</font>
$y = |x|$: la parte negativa viene ribaltata sopra l'asse x (forma a "V")
$y = \ln x + k$, $y = \ln(x - k)$: la costante fuori sposta il grafico in verticale, quella dentro in orizzontale
