import selfsigned from 'selfsigned';
console.log(selfsigned);
const attrs = [{ name: 'commonName', value: 'localhost' }];
try {
    const pems = await selfsigned.generate(attrs, { days: 365 });
    console.log("Keys:", Object.keys(pems));
    console.log("Private check:", typeof pems.private);
    console.log("Cert check:", typeof pems.cert);
} catch (e) {
    console.error(e);
}
