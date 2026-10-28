# Analisi matematica 08/10 – Funzioni infinitesime e confronto

> nel primo parziale si arriva fino allo studio di funzione, nel secondo: integrali, derivate e sommatorie
---
## <font color="#4bacc6">Funzioni infinitesime</font>
una funzione $f(x)$ si dice infinitesima per $x \to x_{0}$ ($x_0$ punto di accumulazione del dominio) se
$$\lim_{x \to x_{0}} f(x) = 0$$
---
## <font color="#4bacc6">Confronto tra infinitesimi</font>
$$\lim_{x \to x_{0}} \frac{f(x)}{g(x)} = \begin{cases} l \ne 0 & \text{ord}(f) = \text{ord}(g) \\ \pm\infty & \text{ord}(f) < \text{ord}(g) \\ 0 & \text{ord}(f) > \text{ord}(g) \\ \nexists & f, g \ \text{non confrontabili} \end{cases}$$
> chi va a 0 più velocemente ha ordine maggiore: se sta sopra il limite fa 0, se sta sotto fa $\infty$
---
## <font color="#4bacc6">Funzioni asintotiche</font>
f e g sono asintotiche per $x \to x_0$ se il loro rapporto tende a 1
$$\lim_{x \to x_{0}} \frac{f(x)}{g(x)} = 1 \qquad f \sim g$$
dai limiti notevoli, per $x \to 0$:
$$\sin x \sim x \qquad \tan x \sim x \qquad \ln(1+x) \sim x \qquad e^{x} - 1 \sim x \qquad 1 - \cos x \sim \frac{x^{2}}{2}$$
---
## <font color="#4bacc6">Esercizi con le asintoticità</font>
si sostituisce ogni pezzo con il suo equivalente e si tiene solo l'ordine più basso
$$\lim_{x \to 0} \frac{\sin 4x + \ln(1+3x)}{1 - \cos x + \tan 2x} = \lim_{x \to 0} \frac{4x + 3x}{2x} = \frac{7}{2}$$
> $1 - \cos x$ è di ordine 2, quindi si trascura rispetto a $\tan 2x$ (ordine 1)
$$\lim_{x \to 0} \frac{\ln(1+x^{2}) + \cos x - e^{x^{3}}}{x^{2}\sin x + 3\tan^{2} x} = \lim_{x \to 0} \frac{x^{2} - \frac{x^{2}}{2} - x^{3}}{x^{3} + 3x^{2}} = \frac{\frac{1}{2}}{3} = \frac{1}{6}$$
> trucco: $\cos x - e^{x^{3}} = (\cos x - 1) + (1 - e^{x^{3}})$, così compaiono due limiti notevoli
$$\lim_{x \to 0^{+}} \frac{[\ln(1+\sin 3x)]^{2} + 1 - \cos x}{e^{3x} - 1 + x\sin\sqrt{x}} = \lim \frac{9x^{2} + \frac{x^{2}}{2}}{3x + x^{3/2}} = 0$$
> se invece il quadrato è dentro il log, $\ln(1+\sin 3x)^{2} = 2\ln(1+\sin 3x) \sim 6x$, e il limite fa $\frac{6x}{3x} = 2$
---
## <font color="#4bacc6">Gerarchia degli infiniti</font>
$$\log x \ll x^{a} \ll a^{x} \ll x^{x}$$
ordini di infinito/infinitesimo di esempio:
$$\text{ord}(\sqrt{x}) = \frac{1}{2} \qquad \text{ord}\left(\frac{1}{\sin x}\right) = 1 \qquad \text{ord}\left(\frac{1}{e^{x}-1}\right) = 1$$
> con i polinomi conta solo il termine che domina: $\frac{x^{2} - x + 1}{x^{3} - x^{2} + x} \sim \frac{x^{2}}{x^{3}}$ per $x \to \infty$
