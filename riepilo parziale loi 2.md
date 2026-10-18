# Limiti infiniti e infinitesimi

## <font color="#4bacc6">Limiti infinitesimi</font>
Una funzione si definisce infinitesima, quando preso un punto di accumulazione del dominio della funzione, il limite che tende in questo punto risulta essere uguale a 0
$$\lim_{ x \to x_{0} } f(x) =0 \text{oppure } \lim_{ n \to \infty } f(x) =0$$
> Un limite che porta la funzione a 0 si dice limite infinitesimo
---
## <font color="#4bacc6">Ordine di infinitesimo</font> 
siano $f(x)\ \ \    \text{e} \ \ \ g(x)$  infinitesime per uno stesso punto $x_0$ nella funzione
$$ \lim_{ x \to x_{0}  } \frac{f(x)}{[g(x)]^{\alpha}} = l \ \ \ \ o \left(  \lim_{ x \to \infty } \frac{f(x)}{[g(x)]^{\alpha}}=l \right)$$con:  
$g(x) \ne 0$ (il denominatore diverso da 0)
$\text{se} \ \ \exists \ \alpha \in R^{+} \ \ e \ \ l \in R, \ \ l\ne 0$  ( esiste un numero che messo alla potenza del denominatore fa si che il limite sia un numero reale diverso da 0)
allora si dice che $x_{0}$, f(x) è un infinitesimo di ordine $\alpha$ rispetto al infinitesimo campione g(x)

> prendiamo un valore( limite notevole) e troviamo il denominatore che fa si che quel valore dia un numero reale diverso da 0 se portato al limite, il grado del denominatore è anche l’ordine di infinitesimo del valore al numeratore 
---

## <font color="#4bacc6">Confronto tra infinitesimi</font>
Sia f(x) e g(x) infinitesime per $x \to x_{0}$ 
$$
\lim_{ x \to x_{0} } \frac{[f(x)]^\alpha}{[g(x)]^\beta}  
\begin{cases}
l \ne 0 &  &  \text{ord}(f) = \text{ord}(g) \\
\pm \infty  &  & \text{ord}(f) < \text{ord}(g) \\ 
0  &  & \text{ord}(f) < \text{ord}(g) \\ 
\text{non esiste}  &   &  f \ e \ g \  \text{non confrontabili}
\end{cases}
$$
Stesso risultato se F(x) g(x) sono infinitesime per $x \to \infty$ 
> prendiamo due valori messi a frazione, possiamo osservare che se $\alpha$ e $\beta$ sono uguali allora avremo che il limite non andrà a zero se svolto
> prendiamo due valori messi a frazione, possiamo osservare che se $\alpha$ è maggiore di  $\beta$ allora avremo che il limite tende a infinito e non dobbiamo svolgerlo oltre
> prendiamo due valori messi a frazione, possiamo osservare che se $\alpha$ è minore di  $\beta$ allora avremo che il limite tende a infinito e non dobbiamo svolgerlo oltre
> prendiamo due valori messi a frazione, possiamo osservare che se $\alpha$ e $\beta$ non sono confrontabili (uno dei due non esiste o non è determinato) allora il limite non esiste

---
## <font color="#4bacc6">Calcolo dei limiti mediante il confronto tra infiitesimi</font>

$$
\lim_{ x \to x_{0}  } \frac{f_{1} + f_{2}}{g_{1} + g_{2}} 
$$
sappiamo che le funzioni che vanno a 0 più velocemente (di grado maggiore) possono essere ignorate ( prendiamo $f_{1}$ e $f_{2}$ se sappiamo che $f_{1}$ va a zero più velocemente allora sappiamo che avvicinandoci a zero avremo un  punto in cui $f_{1}$ è 0 e $f_{2}$ no) 
