# tipi di dato
possiamo trovare 4 tipi di dato nel C base
- int 32b
- char 8b 
- float 32b
- double 64b
per poter vedere la dimensione di una variabile nella ram

```run-c
#include <stdio.h>

int main (void)
{
	int x =0;
	double y =0;
	float z =0;
	char a ='a';
	printf("dim integer: %zu", sizeof(x)*8);
	printf("dim double: %zu", sizeof(y)*8);
	printf("dim float: %zu", sizeof(z)*8); 
	printf("dim char: %zu", sizeof(a)*8); 
	return 0;
}
```