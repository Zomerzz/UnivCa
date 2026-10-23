# Analisi matematica 22/10 – Massimi e minimi, f(x)^g(x), Rolle e Lagrange

## <font color="#4bacc6">Massimo e minimo di funzione</font>
estensione del teorema di Fermat ai punti di frontiera: il massimo/minimo assoluto in $[a,b]$ va cercato tra
- punti interni con $f'(x) = 0$ (stazionari)
- punti dove f non è derivabile
- gli estremi $a$ e $b$
---
## <font color="#4bacc6">Esercizio di derivata</font>
$$f(x) = x\sqrt[3]{x+1} \qquad D = \mathbb{R}$$
$$f'(x) = 1 \cdot \sqrt[3]{x+1} + x \cdot \frac{1}{3\sqrt[3]{(x+1)^{2}}} = \frac{3(x+1) + x}{3\sqrt[3]{(x+1)^{2}}} = \frac{4x+3}{3\sqrt[3]{(x+1)^{2}}}$$
> $D\sqrt[3]{u} = D\,u^{\frac{1}{3}} = \frac{1}{3}u^{-\frac{2}{3}} \cdot u'$
---
## <font color="#4bacc6">Derivata di f(x)^g(x)</font>
si riscrive con la base e:
$$f(x)^{g(x)} = e^{\ln f(x)^{g(x)}} = e^{g(x) \ln f(x)}$$
$$D\left[f(x)^{g(x)}\right] = f(x)^{g(x)} \left[g'(x)\ln f(x) + g(x)\frac{f'(x)}{f(x)}\right]$$
esempio:
$$f(x) = x^{\ln x} = e^{\ln x \cdot \ln x} = e^{(\ln x)^{2}} \qquad f'(x) = e^{(\ln x)^{2}} \cdot 2\ln x \cdot \frac{1}{x} = x^{\ln x} \cdot \frac{2\ln x}{x}$$
> quando la x è sia nella base che nell'esponente, si passa SEMPRE da $e^{\ln}$
---
## <font color="#4bacc6">Teorema di Rolle</font>
sia $f : [a,b] \to \mathbb{R}$
1. continua in $[a,b]$
2. derivabile in $(a,b)$
3. $f(a) = f(b)$ (la funzione agli estremi ha lo stesso valore)

allora esiste almeno un punto stazionario $c \in (a,b)$, $f'(c) = 0$
> dim.: per Weierstrass f ha massimo e minimo in $[a,b]$; se uno dei due è interno, per Fermat lì la derivata è 0 (se sono entrambi agli estremi, f è costante e $f' = 0$ ovunque)

esempi: $f(x) = 5$ in $[1,3]$ → costante, ogni punto è stazionario
$$f(x) = (x^{2} - x)e^{x} \qquad f'(x) = (2x-1)e^{x} + (x^{2}-x)e^{x} = (x^{2} + x - 1)e^{x}$$
> attenzione: in $[-1,1]$ la condizione 3 NON vale, $f(-1) = \frac{2}{e}$ e $f(1) = 0$. Funziona invece in $[0,1]$: $f(0) = f(1) = 0$, e il punto stazionario è $x = \frac{-1+\sqrt{5}}{2} \approx 0{,}62$
---
## <font color="#4bacc6">Teorema di Lagrange (valor medio)</font>
se f è continua in $[a,b]$ e derivabile in $(a,b)$, esiste almeno un $x_0 \in (a,b)$ con
$$f'(x_{0}) = \frac{f(b) - f(a)}{b - a}$$
> esiste un punto in cui la tangente è parallela alla secante che unisce gli estremi (Rolle è il caso con secante orizzontale)

**esempio 1**: $f(x) = \arcsin x$ in $[-1,1]$ — continua in $[-1,1]$, derivabile per $x \ne \pm 1$
$$\frac{1}{\sqrt{1 - x_{0}^{2}}} = \frac{\frac{\pi}{2} - \left(-\frac{\pi}{2}\right)}{2} = \frac{\pi}{2} \ \Rightarrow \ x_{0} = \pm\sqrt{1 - \frac{4}{\pi^{2}}}$$
**esempio 2**: $f(x) = 2x - \sqrt{4 - x^{2}}$ in $[-1,1]$, dominio $-2 \le x \le 2$
$$f'(x) = 2 - \frac{1}{2\sqrt{4-x^{2}}} \cdot (-2x) = 2 + \frac{x}{\sqrt{4 - x^{2}}} \qquad \frac{f(1) - f(-1)}{2} = \frac{(2 - \sqrt{3}) - (-2 - \sqrt{3})}{2} = 2 \ \Rightarrow \ x_{0} = 0$$
> ho letto la funzione come $2x - \sqrt{4-x^{2}}$ dalla derivata che hai scritto, l'esercizio sulla lavagna è rimasto a metà
