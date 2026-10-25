# Analisi matematica 07/10 – Limiti notevoli generalizzati ed esercizi

## <font color="#4bacc6">Cambio di variabile</font>
$$\lim_{x \to 0} \frac{\sin 3x}{x} \qquad 3x = t, \ t \to 0 \qquad = \lim_{t \to 0} \frac{\sin t}{t/3} = \lim_{t \to 0} \frac{3 \sin t}{t} = 3 \cdot 1 = 3$$
> i limiti notevoli valgono con qualsiasi "pezzo" $f(x)$ al posto di x, basta che $f(x) \to 0$
---
## <font color="#4bacc6">Limiti notevoli con f(x) → 0</font>
$$\lim \frac{\sin f(x)}{f(x)} = 1 \qquad \lim \frac{\tan f(x)}{f(x)} = 1 \qquad \lim \frac{1 - \cos f(x)}{[f(x)]^{2}} = \frac{1}{2}$$
$$\lim \frac{\arcsin f(x)}{f(x)} = 1 \qquad \lim \frac{\arctan f(x)}{f(x)} = 1$$
$$\lim_{x \to \infty}\left(1 + \frac{1}{x}\right)^{x} = e \qquad \lim_{x \to 0} \frac{\log_{a}(1+x)}{x} = \log_{a} e \qquad \lim_{x \to 0} \frac{a^{x} - 1}{x} = \ln a$$
$$\lim_{x \to 0} \frac{(1+x)^{k} - 1}{x} = k$$
**dimostrazione del logaritmo**
$$\frac{1}{x}\log_{a}(1+x) = \log_{a}(1+x)^{\frac{1}{x}} \to \log_{a} e$$
**dimostrazione dell'esponenziale**: pongo $a^{x} - 1 = t$, quindi $a^{x} = t + 1$ e $x = \log_{a}(t+1)$, e mi riconduco al limite del logaritmo
---
## <font color="#4bacc6">Tecnica: moltiplicare e dividere</font>
si moltiplica e divide per l'argomento in modo da far comparire i limiti notevoli
$$\lim_{x \to 0} \frac{1 - \cos 2x}{\sin^{2} x} = \lim \frac{1 - \cos 2x}{(2x)^{2}} \cdot \frac{(2x)^{2}}{x^{2}} \cdot \frac{x^{2}}{\sin^{2} x} = \frac{1}{2} \cdot 4 \cdot 1 = 2$$
$$\lim_{x \to 0} \frac{2\ln(1+2x) - \sin 3x}{e^{2x} - 1 + \tan 3x} = \lim \frac{x\left(4\frac{\ln(1+2x)}{2x} - 3\frac{\sin 3x}{3x}\right)}{x\left(2\frac{e^{2x}-1}{2x} + 3\frac{\tan 3x}{3x}\right)} = \frac{4 - 3}{2 + 3} = \frac{1}{5}$$
$$\lim_{x \to 0} \frac{\ln(1+2x) + \sin x}{e^{x} - \cos x} = \lim \frac{x\left(2\frac{\ln(1+2x)}{2x} + \frac{\sin x}{x}\right)}{x\left(\frac{e^{x}-1}{x} - \frac{\cos x - 1}{x}\right)} = \frac{2 + 1}{1 + 0} = 3$$
> si raccoglie la x: ogni pezzo diventa (coefficiente) · (limite notevole che vale 1)
---
## <font color="#4bacc6">Forme 1^∞ e il numero e</font>
$$\lim_{x \to \infty}\left(1 + \frac{2}{x}\right)^{x} = e^{2}$$
$$\lim_{x \to +\infty}\left(\frac{x+1}{x-1}\right)^{3x} \quad x - 1 = t \quad = \lim_{t \to \infty}\left(1 + \frac{2}{t}\right)^{3t+3} = e^{6}$$
> riscrivo la base come $1 + \frac{\text{qualcosa}}{\text{qualcosa che va a } \infty}$, l'esponente moltiplicato per quella frazione dà la potenza di e
---
## <font color="#4bacc6">Esercizio lasciato a metà</font>
$$\lim_{x \to 0} \frac{\sin 3x^{2} \cdot 2\tan^{2} x}{\cos x^{2} - 1} = \lim \frac{3x^{2} \cdot 2x^{2}}{-\frac{(x^{2})^{2}}{2}} = \frac{6x^{4}}{-\frac{x^{4}}{2}} = -12$$
> usando $\sin 3x^{2} \sim 3x^{2}$, $\tan^{2} x \sim x^{2}$, $\cos x^{2} - 1 \sim -\frac{x^{4}}{2}$
