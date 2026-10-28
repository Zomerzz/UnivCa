# Analisi matematica 14/10 – Derivate

## <font color="#4bacc6">Teorema: derivabilità ⇒ continuità</font>
se f è derivabile in tutti i punti di $(a,b)$, allora è continua in ogni punto
**dim.**
$$\lim_{h \to 0} [f(x_{0}+h) - f(x_{0})] = \lim_{h \to 0} \frac{f(x_{0}+h) - f(x_{0})}{h} \cdot h = f'(x_{0}) \cdot 0 = 0$$
quindi $\lim_{h \to 0} f(x_0 + h) = f(x_0)$, cioè f è continua
> il contrario non vale: $e^{|x|}$ è continua ma in 0 ha un punto angoloso
---
## <font color="#4bacc6">Derivate fondamentali (dalla definizione)</font>
$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$
**costante**: $D(k) = \lim \frac{k - k}{h} = 0$

**logaritmo**: $D(\ln x) = \frac{1}{x}$
$$\lim_{h \to 0} \frac{\ln(x+h) - \ln x}{h} = \lim \frac{\ln\left(1 + \frac{h}{x}\right)}{\frac{h}{x} \cdot x} = \frac{1}{x}$$
**esponenziale**: $D(e^{x}) = e^{x}$
$$\lim_{h \to 0} \frac{e^{x+h} - e^{x}}{h} = \lim e^{x} \cdot \frac{e^{h} - 1}{h} = e^{x} \cdot 1$$
**coseno**: $D(\cos x) = -\sin x$, usando $\cos(\alpha + \beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta$
$$\frac{\cos x \cos h - \sin x \sin h - \cos x}{h} = \cos x \cdot \underbrace{\frac{\cos h - 1}{h}}_{\to 0} - \sin x \cdot \underbrace{\frac{\sin h}{h}}_{\to 1} = -\sin x$$
**seno**: $D(\sin x) = \cos x$
$$\frac{\sin x \cos h + \sin h \cos x - \sin x}{h} = \sin x \cdot \underbrace{\frac{\cos h - 1}{h}}_{\to 0} + \cos x \cdot \underbrace{\frac{\sin h}{h}}_{\to 1} = \cos x$$
**potenza**: $D(x^{n}) = n x^{n-1}$
$$\frac{(x+h)^{n} - x^{n}}{h} = x^{n} \cdot \frac{\left(1 + \frac{h}{x}\right)^{n} - 1}{\frac{h}{x} \cdot x} = \frac{x^{n} \cdot n}{x} = n x^{n-1}$$
> trucco ricorrente: si raccoglie, si moltiplica e divide per qualcosa, e si fa comparire un limite notevole
---
## <font color="#4bacc6">Regole di derivazione</font>
$$(f \pm g)' = f' \pm g' \qquad (f \cdot g)' = f'g + fg' \qquad \left(\frac{f}{g}\right)' = \frac{f'g - fg'}{g^{2}}, \ g \ne 0$$
$$(f \cdot g \cdot h)' = f'gh + fg'h + fgh'$$
esempi:
$$D(\sin x \cdot \ln x) = \cos x \cdot \ln x + \sin x \cdot \frac{1}{x} \qquad D(3x^{2}) = 0 \cdot x^{2} + 3 \cdot 2x = 6x$$
**tangente**
$$D(\tan x) = D\frac{\sin x}{\cos x} = \frac{\cos x \cos x - \sin x(-\sin x)}{\cos^{2} x} = \frac{\cos^{2} x + \sin^{2} x}{\cos^{2} x} = \frac{1}{\cos^{2} x} = 1 + \tan^{2} x$$
> attenzione: nella lavagna in un passaggio c'è $\frac{1}{\cos^{2} x} = 1 \cdot \tan^{2} x$, è $1 + \tan^{2} x$ (la somma delle due frazioni)
---
## <font color="#4bacc6">Derivata della funzione composta</font>
$$D[f(g(x))] = f'(g(x)) \cdot g'(x)$$
> si deriva "da fuori verso dentro" e si moltiplica per la derivata di ciò che sta dentro
$$D(e^{3x}) = 3e^{3x} \qquad D(e^{x^{2}}) = 2x e^{x^{2}} \qquad D[\sin(x^{2})] = 2x\cos(x^{2})$$
$$D(x^{2}+1)^{3} = 3(x^{2}+1)^{2} \cdot 2x = 6x(x^{2}+1)^{2}$$
$$D[\ln(1+x^{2})] = \frac{1}{1+x^{2}} \cdot 2x = \frac{2x}{1+x^{2}}$$
$$D[\sin^{2}(3x^{2})] = 2\sin(3x^{2}) \cdot \cos(3x^{2}) \cdot 6x = 12x\sin(3x^{2})\cos(3x^{2})$$
> attenzione: nella lavagna $D(x^{2}+1)^{3}$ è scritto $6x(x^{2}+1)$, manca il quadrato: l'esponente scende di 1, da 3 a 2
