import random

PARAGRAPHS = [
    "The advancement of technology has fundamentally altered the way we communicate and interact with the world around us. In the early days of computing, machines occupied entire rooms and possessed only a fraction of the processing power found in a modern smartphone. Today, we carry the sum of human knowledge in our pockets, accessible with a few taps on a glass screen. This connectivity brings immense opportunities for collaboration and learning, but it also presents challenges regarding privacy, focus, and the digital divide. As we continue to innovate, it is crucial to consider the ethical implications of the tools we build and ensure they serve the collective good of humanity...",
    "Deep in the heart of the ancient forest, sunlight filters through the dense canopy in shimmering pillars of gold. The air is thick with the scent of damp earth and pine needles, and the only sound is the rhythmic chirping of hidden birds. Legends speak of a forgotten city buried beneath the roots of the oldest trees, a place where time stands still and the secrets of the earth are guarded by shadows. Explorers have searched for centuries, but the forest is a shifting maze that only reveals its heart to those who do not seek it for greed or glory. To walk these paths is to acknowledge the vast, silent power of nature..."
]

def get_random_paragraph():
    return random.choice(PARAGRAPHS)